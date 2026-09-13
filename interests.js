// Main-page interest map with meaningful links.
// Edit this file when you want to add, remove or rename nodes.
//
// x and y are percentages of the graph area.
// projectSlugs must match the slug values from projects.js.
//
// Link types are used both visually and conceptually:
// method   — one interest works as a method for another
// material — one interest gives material / evidence / traces
// scale    — connection through body, object, city, territory, landscape
// context  — shared research field or background condition
// tension  — productive conflict between two ideas
// medium   — one interest becomes a form of representation for another

const interests = [
  {id: "landscape-systems",
    title: "landscape systems",
    x: 18,
    y: 28,
    size: "medium",
    projectSlugs: [
      "2025_C_Borderless",
      "2023_С_Last_Glow"
    ]
  },

  {id: "mapping",
    title: "mapping / counter-mapping",
    x: 42,
    y: 18,
    size: "medium",
    projectSlugs: [
      "2021_A_Rybinskoye Reservoir",
      "2023_С_Last_Glow"
    ]
  },

  {id: "archive-memory",
    title: "archive / memory",
    x: 70,
    y: 30,
    size: "large",
    projectSlugs: [
      "2023_С_Last_Glow",
      "2021_A_Rybinskoye Reservoir",
      "2022_C_Devinska_Kobyla",
      "2017_S_Navi_Pavilion"
    ]
  },

  {id: "post-industrial",
    title: "post-industrial landscapes",
    x: 30,
    y: 55,
    size: "small",
    projectSlugs: [
      "2024_S_Factory_Reset"
    ]
  },

  { id: "infrastructure",
    title: "infrastructure",
    x: 56,
    y: 57,
    size: "medium",
    projectSlugs: [
      "2023_С_Last_Glow"
    ]
  },

  { id: "exhibition",
    title: "exhibition as medium",
    x: 80,
    y: 62,
    size: "medium",
    projectSlugs: [
      "2024_A_Exhibition_Model",
      "2023_A_No_Soup_Exhibition",
      "2023_A_Factory_of_Nothing_Tapes",
      "2021_A_Rybinskoye Reservoir"
    ]
  },

  {id: "public-space",
    title: "public space",
    x: 22,
    y: 78,
    size: "medium",
    projectSlugs: [
      "2024_S_Factory_Reset",
      "2022_C_Devinska_Kobyla",
      "2023_A_No_Soup_Exhibition"
    ]
  },

  {id: "ecology",
    title: "ecological thinking",
    x: 52,
    y: 82,
    size: "large",
    projectSlugs: [
      "2025_C_Borderless"
    ]
  },

  {id: "fiction",
    title: "landscape",
    x: 72,
    y: 78,
    size: "large",
    projectSlugs: [
      "2025_C_Borderless"
      "2020_W_Fili"
    ]
  },

   {id: "architecture",
    title: "architecture",
    x: 84,
    y: 86,
    size: "large",
    projectSlugs: [
      "2017_S_Navi_Pavilion",
      "2021_W_Pavlovskaya_27",
      "2020_W_Varshavskoye_Highway_141"
    ]
  }
];
