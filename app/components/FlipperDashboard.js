"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { allItemIds, GE_TAX_RATE, methods } from "../data/methods";

const API_URL = "https://prices.runescape.wiki/api/v2/osrs/latest";
const REFRESH_INTERVAL = 15_000;
const FLASH_DURATION = 1_400;
const METHOD_STORAGE_KEY = "ge-workshop-method";

const coins = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const time = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function formatCoins(value) {
  return Number.isFinite(value) ? `${coins.format(Math.round(value))} gp` : "—";
}

function formatAge(timestamp) {
  if (!timestamp) return "No trade data";
  const seconds = Math.max(0, Math.floor(Date.now() / 1000 - timestamp));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function freshness(timestamp) {
  if (!timestamp) return { tone: "unknown", label: "No recent trade timestamp" };
  const age = Math.max(0, Math.floor(Date.now() / 1000 - timestamp));
  if (age <= 5 * 60) return { tone: "green", label: "Fresh: within 5 minutes" };
  if (age <= 15 * 60) return { tone: "lime", label: "Recent: within 15 minutes" };
  if (age <= 30 * 60) return { tone: "yellow", label: "Aging: within 30 minutes" };
  if (age <= 60 * 60) return { tone: "orange", label: "Stale: within 1 hour" };
  if (age <= 4 * 60 * 60) return { tone: "deep-orange", label: "Very stale: within 4 hours" };
  return { tone: "red", label: "Old: more than 4 hours" };
}

function FreshnessDot({ timestamp }) {
  const state = freshness(timestamp);
  return (
    <i
      className={`freshness-dot ${state.tone}`}
      title={`${state.label}${timestamp ? ` · ${formatAge(timestamp)}` : ""}`}
      aria-label={`${state.label}${timestamp ? `, ${formatAge(timestamp)}` : ""}`}
    />
  );
}

function FlashValue({ changed = false, children }) {
  return <span className={changed ? "price-flash" : undefined}>{children}</span>;
}

function Quote({ value, timestamp, changed = false }) {
  return (
    <FlashValue changed={changed}>
      <FreshnessDot timestamp={timestamp} />
      {formatCoins(value)}
    </FlashValue>
  );
}

function wikiUrl(id) {
  return `https://prices.runescape.wiki/osrs/item/${id}`;
}

function PricePair({ item, price, componentName, componentPlural, effectiveQuote, effectiveLabel, changedQuotes }) {
  return (
    <div className={`price-row ${effectiveQuote ? "with-effective" : ""}`}>
      <div className="item-name">
        <a href={wikiUrl(item.id)} target="_blank" rel="noreferrer">
          {item.name}
          <span aria-hidden="true">↗</span>
        </a>
        {item.yield && <small>{item.yield} {item.yield === 1 ? componentName : componentPlural}</small>}
      </div>
      <div className="price-cell">
        <span>Instant buy</span>
        <strong><Quote value={price?.high} timestamp={price?.highTime} changed={changedQuotes.has(`${item.id}:high`)} /></strong>
        <small>{formatAge(price?.highTime)}</small>
      </div>
      <div className="price-cell">
        <span>Instant sell</span>
        <strong><Quote value={price?.low} timestamp={price?.lowTime} changed={changedQuotes.has(`${item.id}:low`)} /></strong>
        <small>{formatAge(price?.lowTime)}</small>
      </div>
      {effectiveQuote && (
        <div className="price-cell effective-cell">
          <span>{effectiveLabel}</span>
          <strong><Quote value={effectiveQuote.value} timestamp={effectiveQuote.timestamp} changed={effectiveQuote.changed} /></strong>
          <small>{formatAge(effectiveQuote.timestamp)}</small>
        </div>
      )}
    </div>
  );
}

function LoadingRows({ count, withEffective }) {
  return Array.from({ length: count }, (_, index) => (
    <div className={`price-row skeleton-row ${withEffective ? "with-effective" : ""}`} key={index} aria-hidden="true">
      <div className="skeleton wide" />
      <div className="skeleton" />
      <div className="skeleton" />
      {withEffective && <div className="skeleton" />}
    </div>
  ));
}

export default function FlipperDashboard() {
  const [methodId, setMethodId] = useState(methods[0].id);
  const [strategy, setStrategy] = useState("patient");
  const [prices, setPrices] = useState({});
  const [status, setStatus] = useState("loading");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState("");
  const [changedQuotes, setChangedQuotes] = useState(new Set());
  const previousPricesRef = useRef({});
  const flashTimerRef = useRef(null);

  const method = methods.find((entry) => entry.id === methodId) ?? methods[0];
  const showEffectiveSources = Boolean(method.effectiveLabel);
  const inputPriceKey = strategy === "patient" ? "low" : "high";
  const outputPriceKey = strategy === "patient" ? "high" : "low";

  const loadPrices = useCallback(async () => {
    setStatus((current) => (current === "ready" ? "refreshing" : "loading"));
    setError("");
    try {
      const response = await fetch(API_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`Price service returned ${response.status}`);
      const payload = await response.json();
      const relevant = Object.fromEntries(
        allItemIds.map((id) => [id, payload.data?.[id]]).filter(([, value]) => value),
      );
      const previous = previousPricesRef.current;
      if (Object.keys(previous).length > 0) {
        const changes = new Set();
        allItemIds.forEach((id) => {
          ["high", "low"].forEach((side) => {
            if (relevant[id]?.[side] !== previous[id]?.[side]) changes.add(`${id}:${side}`);
          });
        });
        if (changes.size > 0) {
          if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
          setChangedQuotes(changes);
          flashTimerRef.current = window.setTimeout(() => {
            setChangedQuotes(new Set());
            flashTimerRef.current = null;
          }, FLASH_DURATION);
        }
      }
      previousPricesRef.current = relevant;
      setPrices(relevant);
      setLastUpdated(new Date());
      setStatus("ready");
    } catch (requestError) {
      setStatus("error");
      setError(requestError instanceof Error ? requestError.message : "Could not load prices");
    }
  }, []);

  useEffect(() => {
    const startup = window.setTimeout(loadPrices, 0);
    const timer = window.setInterval(loadPrices, REFRESH_INTERVAL);
    return () => {
      window.clearTimeout(startup);
      window.clearInterval(timer);
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    };
  }, [loadPrices]);

  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const savedMethod = window.localStorage.getItem(METHOD_STORAGE_KEY);
        if (methods.some((entry) => entry.id === savedMethod)) setMethodId(savedMethod);
      } catch {
        // Storage can be unavailable in private or restricted browser contexts.
      }
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);

  function handleMethodChange(event) {
    const nextMethod = event.target.value;
    setMethodId(nextMethod);
    try {
      window.localStorage.setItem(METHOD_STORAGE_KEY, nextMethod);
    } catch {
      // The selection still works for the current session without storage.
    }
  }

  const analysis = useMemo(() => {
    const routes = method.routes ?? method.sources.map((source, index) => ({
      name: source.name,
      action: index === 0
        ? `Buy ${source.name} directly.`
        : `Buy ${source.name} and break it into ${source.yield} ${source.yield === 1 ? method.componentName : method.componentPlural}.`,
      yield: source.yield,
      inputs: [{ id: source.id, quantity: 1 }],
    }));
    const sourceCosts = routes
      .map((route) => {
        const routeTimes = route.inputs
          .map((input) => prices[input.id]?.[`${inputPriceKey}Time`])
          .filter(Number.isFinite);
        return {
          ...route,
          routeTime: routeTimes.length === route.inputs.length ? Math.min(...routeTimes) : undefined,
          perPlate: route.inputs.reduce(
          (total, input) => total + (prices[input.id]?.[inputPriceKey] ?? Number.NaN) * input.quantity,
          0,
        ) / route.yield,
        };
      })
      .filter((source) => Number.isFinite(source.perPlate));
    const cheapest = sourceCosts.sort((a, b) => a.perPlate - b.perPlate)[0];

    const products = method.products.map((product) => {
      const inputCost = prices[product.input.id]?.[inputPriceKey];
      const outputRevenue = prices[product.output.id]?.[outputPriceKey];
      const inputTime = prices[product.input.id]?.[`${inputPriceKey}Time`];
      const outputTime = prices[product.output.id]?.[`${outputPriceKey}Time`];
      const plateCost = cheapest ? cheapest.perPlate * product.components : undefined;
      const productionCost = Number.isFinite(inputCost) && Number.isFinite(plateCost)
        ? inputCost + plateCost
        : undefined;
      const tax = Number.isFinite(outputRevenue) ? Math.floor(outputRevenue * GE_TAX_RATE) : undefined;
      const netRevenue = Number.isFinite(outputRevenue) ? outputRevenue - tax : undefined;
      const profit = Number.isFinite(netRevenue) && Number.isFinite(productionCost)
        ? netRevenue - productionCost
        : undefined;
      return { ...product, inputCost, inputTime, outputRevenue, outputTime, plateCost, productionCost, tax, netRevenue, profit };
    });

    return { sourceCosts, cheapest, products };
  }, [inputPriceKey, method, outputPriceKey, prices]);

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="GE Workshop home">
          <span className="brand-mark">GE</span>
          <span>Workshop</span>
        </a>
        <div className={`live-status ${status}`}>
          <i />
          {status === "error" ? "Feed unavailable" : status === "loading" ? "Connecting" : "Live prices"}
        </div>
      </header>

      <section className="control-bar" id="top" aria-label="Calculator controls">
        <label className="select-control method-select" htmlFor="method">
          <span>Method</span>
          <select id="method" value={methodId} onChange={handleMethodChange}>
            {methods.map((entry) => <option value={entry.id} key={entry.id}>{entry.name}</option>)}
          </select>
        </label>
        <label className="select-control" htmlFor="strategy">
          <span>Pricing</span>
          <select id="strategy" value={strategy} onChange={(event) => setStrategy(event.target.value)}>
            <option value="patient">Patient offers</option>
            <option value="instant">Instant execution</option>
          </select>
        </label>
        <button className="refresh" onClick={loadPrices} disabled={status === "loading" || status === "refreshing"}>
          <span aria-hidden="true">↻</span>
          <b>{status === "refreshing" ? "Refreshing…" : "Refresh"}</b>
        </button>
      </section>

      <section className="method-heading">
        <div>
          <p className="kicker">{method.eyebrow}</p>
          <h2>{method.name}</h2>
        </div>
      </section>

      {status === "error" && (
        <div className="error-banner" role="alert">
          <span><strong>Price feed unavailable.</strong> {error}</span>
          <button onClick={loadPrices}>Try again</button>
        </div>
      )}

      <section className="source-layout">
        <div className="panel source-panel">
          <div className="panel-title">
            <div><span className="step">01</span><h3>{method.componentLabel}</h3></div>
            <p>{method.routes
              ? `Compares direct purchase with the combined ${strategy === "patient" ? "instant-sell" : "instant-buy"} price of every recipe input.`
              : `Effective component cost uses each item's ${strategy === "patient" ? "instant-sell" : "instant-buy"} price divided by its yield.`}</p>
          </div>
          <div className={`table-head ${showEffectiveSources ? "with-effective" : ""}`}>
            <span>Item</span><span>Buy price</span><span>Sell price</span>
            {showEffectiveSources && <span>{method.effectiveLabel}</span>}
          </div>
          {status === "loading" ? <LoadingRows count={method.sources.length} withEffective={showEffectiveSources} /> : method.sources.map((item) => {
            const sourceRoute = showEffectiveSources
              ? analysis.sourceCosts.find((route) => route.inputs.length === 1 && route.inputs[0].id === item.id)
              : undefined;
            return (
              <PricePair
                item={item}
                price={prices[item.id]}
                componentName={method.componentName}
                componentPlural={method.componentPlural}
                effectiveLabel={method.effectiveLabel}
                effectiveQuote={sourceRoute ? {
                  value: sourceRoute.perPlate,
                  timestamp: sourceRoute.routeTime,
                  changed: changedQuotes.has(`${item.id}:${inputPriceKey}`),
                } : undefined}
                changedQuotes={changedQuotes}
                key={item.id}
              />
            );
          })}
        </div>

        <aside className="cheapest-card">
          <div className="route-price">
            <p className="kicker">Best component route</p>
            <strong className="big-number"><Quote
              value={analysis.cheapest?.perPlate}
              timestamp={analysis.cheapest?.routeTime}
              changed={analysis.cheapest?.inputs.some((input) => changedQuotes.has(`${input.id}:${inputPriceKey}`))}
            /></strong>
            <span>per {method.componentName}</span>
          </div>
          <div className="route-detail">
            <p>{analysis.cheapest?.action ?? "Waiting for price data."}</p>
            <small>{strategy === "patient" ? "Patient buy offers" : "Instant-buy prices"} · no processing cost included.</small>
          </div>
        </aside>
      </section>

      <section className="panel products-panel">
          <div className="panel-title">
            <div><span className="step">02</span><h3>Final products</h3></div>
            <p>Uses the cheapest component route and {strategy === "patient" ? "patient offers" : "instant execution"}; profit includes 2% GE tax.</p>
        </div>
        <div className="product-grid">
          {analysis.products.map((product) => {
            const componentChanged = analysis.cheapest?.inputs.some(
              (input) => changedQuotes.has(`${input.id}:${inputPriceKey}`),
            );
            const inputChanged = changedQuotes.has(`${product.input.id}:${inputPriceKey}`);
            const outputChanged = changedQuotes.has(`${product.output.id}:${outputPriceKey}`);
            const productionChanged = componentChanged || inputChanged;
            return (
            <article className="product-card" key={product.output.id}>
              <div className="product-top">
                <div>
                  <span className="recipe-count">{product.components} {product.components === 1 ? method.componentName : method.componentPlural}</span>
                  <h4><a href={wikiUrl(product.output.id)} target="_blank" rel="noreferrer">{product.output.name} ↗</a></h4>
                </div>
                <span className={`profit-pill ${product.profit >= 0 ? "positive" : "negative"}`}>
                  {Number.isFinite(product.profit) ? (product.profit >= 0 ? "Profit" : "Loss") : "Waiting"}
                </span>
              </div>
              <dl>
                <div><dt><a href={wikiUrl(product.input.id)} target="_blank" rel="noreferrer">{product.input.name} ↗</a></dt><dd><Quote value={product.inputCost} timestamp={product.inputTime} changed={inputChanged} /></dd></div>
                <div><dt>{method.componentPlural}</dt><dd><FlashValue changed={componentChanged}>{formatCoins(product.plateCost)}</FlashValue></dd></div>
                <div className="subtotal"><dt>Production cost</dt><dd><FlashValue changed={productionChanged}>{formatCoins(product.productionCost)}</FlashValue></dd></div>
                <div><dt>{strategy === "patient" ? "Patient-offer revenue" : "Instant-sell revenue"}</dt><dd><Quote value={product.outputRevenue} timestamp={product.outputTime} changed={outputChanged} /></dd></div>
                <div><dt>GE tax · 2%</dt><dd>− <FlashValue changed={outputChanged}>{formatCoins(product.tax)}</FlashValue></dd></div>
              </dl>
              <div className={`profit-total ${product.profit >= 0 ? "positive" : "negative"}`}>
                <strong><FlashValue changed={productionChanged || outputChanged}>{formatCoins(product.profit)}</FlashValue></strong>
                <small>{Number.isFinite(product.profit) && Number.isFinite(product.productionCost)
                  ? `${((product.profit / product.productionCost) * 100).toFixed(2)}% return`
                  : "Awaiting trade data"}</small>
              </div>
              <div className="market-pair">
                <span>Input buy <b><Quote value={prices[product.input.id]?.high} timestamp={prices[product.input.id]?.highTime} changed={changedQuotes.has(`${product.input.id}:high`)} /></b></span>
                <span>Input sell <b><Quote value={prices[product.input.id]?.low} timestamp={prices[product.input.id]?.lowTime} changed={changedQuotes.has(`${product.input.id}:low`)} /></b></span>
                <span>Output buy <b><Quote value={prices[product.output.id]?.high} timestamp={prices[product.output.id]?.highTime} changed={changedQuotes.has(`${product.output.id}:high`)} /></b></span>
                <span>Output sell <b><Quote value={prices[product.output.id]?.low} timestamp={prices[product.output.id]?.lowTime} changed={changedQuotes.has(`${product.output.id}:low`)} /></b></span>
              </div>
            </article>
            );
          })}
        </div>
      </section>

      <footer>
        <p>Prices from the OSRS Wiki real-time price API. Recent trades are indicative, not guaranteed.</p>
        <p>{lastUpdated ? `Updated ${time.format(lastUpdated)} · auto-refreshes every 15s` : "Waiting for live prices…"}</p>
      </footer>
    </main>
  );
}
