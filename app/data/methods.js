export const GE_TAX_RATE = 0.02;

export const methods = [
  {
    id: "masori-fortification",
    eyebrow: "Deconstruct → combine → sell",
    name: "Masori fortification",
    summary:
      "Break down Armadyl armour for Armadylean plates, combine them with Masori armour, and sell the fortified result.",
    componentLabel: "Plate sources",
    componentName: "Armadylean plate",
    componentPlural: "Armadylean plates",
    componentSymbol: "A",
    effectiveLabel: "Per plate",
    componentDescription:
      "Effective plate cost uses each item's instant-buy price divided by its plate yield.",
    sources: [
      { id: 27269, name: "Armadylean plate", yield: 1 },
      { id: 11826, name: "Armadyl helmet", yield: 1 },
      { id: 11830, name: "Armadyl chainskirt", yield: 3 },
      { id: 11828, name: "Armadyl chestplate", yield: 4 },
    ],
    products: [
      {
        input: { id: 27226, name: "Masori mask" },
        output: { id: 27235, name: "Masori mask (f)" },
        components: 1,
      },
      {
        input: { id: 27232, name: "Masori chaps" },
        output: { id: 27241, name: "Masori chaps (f)" },
        components: 3,
      },
      {
        input: { id: 27229, name: "Masori body" },
        output: { id: 27238, name: "Masori body (f)" },
        components: 4,
      },
    ],
  },
  {
    id: "torva-restoration",
    eyebrow: "Deconstruct → repair → sell",
    name: "Torva restoration",
    summary:
      "Break down Bandos armour for Bandosian components, combine them with damaged Torva armour, and sell the restored result.",
    componentLabel: "Component sources",
    componentName: "Bandosian component",
    componentPlural: "Bandosian components",
    componentSymbol: "B",
    effectiveLabel: "Per component",
    sources: [
      { id: 26394, name: "Bandosian components", yield: 1 },
      { id: 11834, name: "Bandos tassets", yield: 2 },
      { id: 11832, name: "Bandos chestplate", yield: 3 },
    ],
    products: [
      {
        input: { id: 26376, name: "Torva full helm (damaged)" },
        output: { id: 26382, name: "Torva full helm" },
        components: 1,
      },
      {
        input: { id: 26378, name: "Torva platebody (damaged)" },
        output: { id: 26384, name: "Torva platebody" },
        components: 2,
      },
      {
        input: { id: 26380, name: "Torva platelegs (damaged)" },
        output: { id: 26386, name: "Torva platelegs" },
        components: 2,
      },
    ],
  },
  {
    id: "spirit-shield-assembly",
    eyebrow: "Bless → attach sigil → sell",
    name: "Spirit shield assembly",
    summary:
      "Buy a blessed spirit shield or make one from a spirit shield and holy elixir, attach a sigil, and sell the completed shield. Calculations assume skilled assembly with no NPC fee.",
    componentLabel: "Blessed shield sources",
    componentName: "blessed spirit shield",
    componentPlural: "blessed spirit shields",
    componentSymbol: "S",
    sources: [
      { id: 12831, name: "Blessed spirit shield" },
      { id: 12829, name: "Spirit shield" },
      { id: 12833, name: "Holy elixir" },
    ],
    routes: [
      {
        name: "Blessed spirit shield",
        action: "Buy a blessed spirit shield directly.",
        yield: 1,
        inputs: [{ id: 12831, quantity: 1 }],
      },
      {
        name: "Spirit shield + holy elixir",
        action: "Buy a spirit shield and holy elixir, then bless the shield.",
        yield: 1,
        inputs: [
          { id: 12829, quantity: 1 },
          { id: 12833, quantity: 1 },
        ],
      },
    ],
    products: [
      {
        input: { id: 12823, name: "Spectral sigil" },
        output: { id: 12821, name: "Spectral spirit shield" },
        components: 1,
      },
      {
        input: { id: 12827, name: "Arcane sigil" },
        output: { id: 12825, name: "Arcane spirit shield" },
        components: 1,
      },
      {
        input: { id: 12819, name: "Elysian sigil" },
        output: { id: 12817, name: "Elysian spirit shield" },
        components: 1,
      },
    ],
  },
];

export const allItemIds = methods.flatMap((method) => [
  ...method.sources.map((item) => item.id),
  ...method.products.flatMap((product) => [product.input.id, product.output.id]),
]);
