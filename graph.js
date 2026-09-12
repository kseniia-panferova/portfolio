// Interest + project map.
// Interests and their projectSlugs are edited in interests.js.
// Project names / URLs come from projects.js.

const interestData = typeof interests !== "undefined" && Array.isArray(interests) ? interests : [];
const projectData = typeof projects !== "undefined" && Array.isArray(projects) ? projects : [];

const graphRoot = document.getElementById("interest-graph");
const nodesRoot = document.getElementById("graph-nodes");
const linesRoot = document.getElementById("graph-lines");
const panelRoot = document.getElementById("interest-panel");
const layoutRoot = document.querySelector(".interest-layout");

const projectBySlug = new Map(projectData.map((project) => [project.slug, project]));
const interestById = new Map(interestData.map((interest) => [interest.id, interest]));

let selectedInterestId = null;
let projectPositions = new Map();

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function projectUrl(slug) {
  return `projects/${encodeURI(slug)}/?from=map`;
}

function normalizeLinks(interest) {
  if (Array.isArray(interest.links)) {
    return interest.links
      .map((link) => ({
        target: link.target,
        type: link.type || "context",
        label: link.label || ""
      }))
      .filter((link) => link.target && interestById.has(link.target));
  }

  if (Array.isArray(interest.relatedTo)) {
    return interest.relatedTo
      .map((target) => ({ target, type: "context", label: "" }))
      .filter((link) => link.target && interestById.has(link.target));
  }

  return [];
}

function getProjectList(interest) {
  return (interest.projectSlugs || [])
    .map((slug) => projectBySlug.get(slug))
    .filter(Boolean);
}

function getAllUniqueInterestLinks() {
  const unique = new Map();

  interestData.forEach((source) => {
    normalizeLinks(source).forEach((link) => {
      const target = interestById.get(link.target);
      if (!target) return;

      const pairKey = [source.id, target.id].sort().join("__");
      if (!unique.has(pairKey)) {
        unique.set(pairKey, {
          source: source.id,
          target: target.id,
          type: link.type || "context"
        });
      }
    });
  });

  return [...unique.values()];
}

function getProjectInterestIds(slug) {
  return interestData
    .filter((interest) => (interest.projectSlugs || []).includes(slug))
    .map((interest) => interest.id);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function positionIsFree(candidate, placed) {
  return placed.every((point) => {
    const dx = (candidate.x - point.x) * 1.18;
    const dy = candidate.y - point.y;
    return Math.hypot(dx, dy) > 7.2;
  });
}

function calculateProjectPositions() {
  const positions = new Map();
  const placed = [];
  const goldenAngle = 2.399963229728653;

  projectData.forEach((project, index) => {
    const interestIds = getProjectInterestIds(project.slug);
    const linkedInterests = interestIds.map((id) => interestById.get(id)).filter(Boolean);

    let centerX;
    let centerY;

    if (linkedInterests.length) {
      centerX = linkedInterests.reduce((sum, interest) => sum + Number(interest.x || 50), 0) / linkedInterests.length;
      centerY = linkedInterests.reduce((sum, interest) => sum + Number(interest.y || 50), 0) / linkedInterests.length;
    } else {
      // Projects without tags remain visible at the edge of the field.
      const side = index % 4;
      const offset = 14 + ((index * 13) % 70);
      if (side === 0) { centerX = offset; centerY = 91; }
      if (side === 1) { centerX = 91; centerY = offset; }
      if (side === 2) { centerX = offset; centerY = 9; }
      if (side === 3) { centerX = 9; centerY = offset; }
    }

    const seed = hashString(project.slug);
    const baseAngle = ((seed % 360) * Math.PI) / 180;
    const baseRadius = linkedInterests.length >= 3 ? 4.5 : linkedInterests.length === 2 ? 6 : 8.5;

    let chosen = { x: centerX, y: centerY };

    for (let attempt = 0; attempt < 32; attempt += 1) {
      const angle = baseAngle + attempt * goldenAngle;
      const radius = attempt === 0 ? baseRadius : baseRadius + Math.floor((attempt + 2) / 4) * 2.1;
      const candidate = {
        x: clamp(centerX + Math.cos(angle) * radius, 8, 92),
        y: clamp(centerY + Math.sin(angle) * radius * 0.78, 8, 92)
      };

      chosen = candidate;
      if (positionIsFree(candidate, placed)) break;
    }

    positions.set(project.slug, chosen);
    placed.push(chosen);
  });

  projectPositions = positions;
}

function makeSvgLine(x1, y1, x2, y2, className) {
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", x1);
  line.setAttribute("y1", y1);
  line.setAttribute("x2", x2);
  line.setAttribute("y2", y2);
  line.setAttribute("class", className);
  return line;
}

function drawLines() {
  if (!linesRoot) return;
  linesRoot.innerHTML = "";

  // Concept-to-concept links stay in the background as a secondary layer.
  getAllUniqueInterestLinks().forEach((link) => {
    const source = interestById.get(link.source);
    const target = interestById.get(link.target);
    if (!source || !target) return;

    const line = makeSvgLine(
      source.x,
      source.y,
      target.x,
      target.y,
      `graph-line graph-line--interest graph-line--${link.type}`
    );

    line.dataset.sourceInterest = source.id;
    line.dataset.targetInterest = target.id;
    line.dataset.lineKind = "interest";
    linesRoot.appendChild(line);
  });

  // Every project is linked to each interest that contains its slug.
  projectData.forEach((project) => {
    const position = projectPositions.get(project.slug);
    if (!position) return;

    getProjectInterestIds(project.slug).forEach((interestId) => {
      const interest = interestById.get(interestId);
      if (!interest) return;

      const line = makeSvgLine(
        interest.x,
        interest.y,
        position.x,
        position.y,
        "graph-line graph-line--project"
      );

      line.dataset.interestId = interest.id;
      line.dataset.projectSlug = project.slug;
      line.dataset.lineKind = "project";
      linesRoot.appendChild(line);
    });
  });
}

function createInterestNode(interest) {
  const button = document.createElement("button");
  button.className = `interest-node interest-node--${interest.size || "medium"}`;
  button.type = "button";
  button.dataset.interestId = interest.id;
  button.setAttribute("aria-label", interest.title);
  button.style.setProperty("--x", `${interest.x}%`);
  button.style.setProperty("--y", `${interest.y}%`);

  const label = document.createElement("span");
  label.className = "interest-node-label";
  label.textContent = interest.title;
  button.appendChild(label);

  button.addEventListener("mouseenter", () => {
    if (!selectedInterestId) setInterestHighlight(interest.id, true);
  });

  button.addEventListener("mouseleave", () => {
    if (!selectedInterestId) clearGraphHighlight();
  });

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    if (selectedInterestId === interest.id) {
      hidePanel();
    } else {
      selectInterest(interest.id);
    }
  });

  return button;
}

function createProjectNode(project) {
  const position = projectPositions.get(project.slug);
  const link = document.createElement("a");
  link.className = "project-node";
  link.href = projectUrl(project.slug);
  link.dataset.projectSlug = project.slug;
  link.setAttribute("aria-label", `Open project: ${project.title}`);
  link.style.setProperty("--x", `${position?.x ?? 50}%`);
  link.style.setProperty("--y", `${position?.y ?? 50}%`);

  const label = document.createElement("span");
  label.className = "project-node-label";
  label.textContent = project.title;
  link.appendChild(label);

  link.addEventListener("mouseenter", () => setProjectHighlight(project.slug));
  link.addEventListener("mouseleave", () => {
    if (selectedInterestId) {
      setInterestHighlight(selectedInterestId, false);
    } else {
      clearGraphHighlight();
    }
  });

  link.addEventListener("click", (event) => event.stopPropagation());
  return link;
}

function renderNodes() {
  if (!nodesRoot) return;
  nodesRoot.innerHTML = "";

  interestData.forEach((interest) => nodesRoot.appendChild(createInterestNode(interest)));
  projectData.forEach((project) => nodesRoot.appendChild(createProjectNode(project)));
}


function applyProjectPositions() {
  document.querySelectorAll(".project-node").forEach((node) => {
    const position = projectPositions.get(node.dataset.projectSlug);
    if (!position) return;
    node.style.setProperty("--x", `${position.x}%`);
    node.style.setProperty("--y", `${position.y}%`);
  });
}

function getCollisionPush(a, b, gap) {
  const overlapX = (a.width + b.width) / 2 + gap - Math.abs(a.x - b.x);
  const overlapY = (a.height + b.height) / 2 + gap - Math.abs(a.y - b.y);

  if (overlapX <= 0 || overlapY <= 0) return null;

  // Resolve along the axis that requires the smaller movement. This keeps
  // labels close to their semantic / averaged position instead of scattering them.
  if (overlapX < overlapY) {
    let direction = Math.sign(a.x - b.x);
    if (!direction) direction = hashString(`${a.key}__${b.key}`) % 2 ? 1 : -1;
    return { x: direction * (overlapX + 0.5), y: 0 };
  }

  let direction = Math.sign(a.y - b.y);
  if (!direction) direction = hashString(`${a.key}__${b.key}__y`) % 2 ? 1 : -1;
  return { x: 0, y: direction * (overlapY + 0.5) };
}

function keepInsideGraph(point, width, height, edgePadding) {
  const minX = point.width / 2 + edgePadding;
  const maxX = width - point.width / 2 - edgePadding;
  const minY = point.height / 2 + edgePadding;
  const maxY = height - point.height / 2 - edgePadding;

  point.x = clamp(point.x, minX, Math.max(minX, maxX));
  point.y = clamp(point.y, minY, Math.max(minY, maxY));
}

function resolveNodeCollisions() {
  if (!graphRoot) return;

  const graphRect = graphRoot.getBoundingClientRect();
  if (!graphRect.width || !graphRect.height) return;

  // Smaller screens need a slightly tighter packing, but labels still receive
  // a real buffer rather than being allowed to touch.
  const gap = graphRect.width <= 640 ? 7 : 11;
  const edgePadding = graphRect.width <= 640 ? 6 : 10;

  // Interests are deliberate manual anchors. We never move them here; project
  // labels flow around their actual rendered bounding boxes.
  const fixedInterests = [...document.querySelectorAll(".interest-node")].map((node) => {
    const rect = node.getBoundingClientRect();
    return {
      key: `interest:${node.dataset.interestId}`,
      x: rect.left - graphRect.left + rect.width / 2,
      y: rect.top - graphRect.top + rect.height / 2,
      width: rect.width,
      height: rect.height
    };
  });

  const movableProjects = [...document.querySelectorAll(".project-node")].map((node) => {
    const rect = node.getBoundingClientRect();
    const slug = node.dataset.projectSlug;
    const position = projectPositions.get(slug) || { x: 50, y: 50 };
    const anchorX = (position.x / 100) * graphRect.width;
    const anchorY = (position.y / 100) * graphRect.height;

    return {
      key: `project:${slug}`,
      slug,
      node,
      x: anchorX,
      y: anchorY,
      anchorX,
      anchorY,
      width: rect.width,
      height: rect.height
    };
  });

  // Iterative rectangle relaxation: projects repel both tags and one another,
  // while a very gentle pull keeps each project near the average of its tags.
  for (let iteration = 0; iteration < 90; iteration += 1) {
    let largestMove = 0;

    movableProjects.forEach((project) => {
      const pull = iteration < 20 ? 0.010 : 0.004;
      const dx = (project.anchorX - project.x) * pull;
      const dy = (project.anchorY - project.y) * pull;
      project.x += dx;
      project.y += dy;
      largestMove = Math.max(largestMove, Math.abs(dx), Math.abs(dy));

      fixedInterests.forEach((interest) => {
        const push = getCollisionPush(project, interest, gap);
        if (!push) return;
        project.x += push.x;
        project.y += push.y;
        largestMove = Math.max(largestMove, Math.abs(push.x), Math.abs(push.y));
      });

      keepInsideGraph(project, graphRect.width, graphRect.height, edgePadding);
    });

    for (let i = 0; i < movableProjects.length; i += 1) {
      for (let j = i + 1; j < movableProjects.length; j += 1) {
        const a = movableProjects[i];
        const b = movableProjects[j];
        const push = getCollisionPush(a, b, gap);
        if (!push) continue;

        // Both project nodes are movable, so share the displacement equally.
        a.x += push.x / 2;
        a.y += push.y / 2;
        b.x -= push.x / 2;
        b.y -= push.y / 2;

        keepInsideGraph(a, graphRect.width, graphRect.height, edgePadding);
        keepInsideGraph(b, graphRect.width, graphRect.height, edgePadding);
        largestMove = Math.max(largestMove, Math.abs(push.x / 2), Math.abs(push.y / 2));
      }
    }

    if (iteration > 18 && largestMove < 0.12) break;
  }

  movableProjects.forEach((project) => {
    const position = {
      x: (project.x / graphRect.width) * 100,
      y: (project.y / graphRect.height) * 100
    };
    projectPositions.set(project.slug, position);
    project.node.style.setProperty("--x", `${position.x}%`);
    project.node.style.setProperty("--y", `${position.y}%`);
  });

  // Lines must terminate at the final de-collided project positions.
  drawLines();
}

function clearGraphHighlight() {
  document.querySelectorAll(".interest-node, .project-node").forEach((node) => {
    node.classList.remove("is-active", "is-linked", "is-dimmed");
  });

  document.querySelectorAll(".graph-line").forEach((line) => {
    line.classList.remove("is-active", "is-dimmed");
  });
}

function setInterestHighlight(interestId, transient = false) {
  clearGraphHighlight();
  const linkedProjects = new Set(
    (interestById.get(interestId)?.projectSlugs || []).filter((slug) => projectBySlug.has(slug))
  );

  document.querySelectorAll(".interest-node").forEach((node) => {
    const active = node.dataset.interestId === interestId;
    node.classList.toggle("is-active", active);
    node.classList.toggle("is-dimmed", !active);
  });

  document.querySelectorAll(".project-node").forEach((node) => {
    const linked = linkedProjects.has(node.dataset.projectSlug);
    node.classList.toggle("is-linked", linked);
    node.classList.toggle("is-dimmed", !linked);
  });

  document.querySelectorAll(".graph-line").forEach((line) => {
    const isProjectLine = line.dataset.lineKind === "project";
    const isConceptLine = line.dataset.lineKind === "interest";
    const activeProjectLine = isProjectLine && line.dataset.interestId === interestId;
    const activeConceptLine = isConceptLine && (
      line.dataset.sourceInterest === interestId || line.dataset.targetInterest === interestId
    );

    line.classList.toggle("is-active", activeProjectLine || activeConceptLine);
    line.classList.toggle("is-dimmed", !(activeProjectLine || activeConceptLine));
  });

  if (transient) {
    document.querySelectorAll(".interest-node.is-dimmed").forEach((node) => {
      node.classList.remove("is-dimmed");
    });
  }
}

function setProjectHighlight(slug) {
  clearGraphHighlight();
  const linkedInterestIds = new Set(getProjectInterestIds(slug));

  document.querySelectorAll(".project-node").forEach((node) => {
    const active = node.dataset.projectSlug === slug;
    node.classList.toggle("is-active", active);
    node.classList.toggle("is-dimmed", !active);
  });

  document.querySelectorAll(".interest-node").forEach((node) => {
    const linked = linkedInterestIds.has(node.dataset.interestId);
    node.classList.toggle("is-linked", linked);
    node.classList.toggle("is-dimmed", !linked);
  });

  document.querySelectorAll(".graph-line").forEach((line) => {
    const active = line.dataset.lineKind === "project" && line.dataset.projectSlug === slug;
    line.classList.toggle("is-active", active);
    line.classList.toggle("is-dimmed", !active);
  });
}

function renderProjects(interest) {
  const relatedProjects = getProjectList(interest);

  if (!relatedProjects.length) {
    return `<p class="panel-note">No linked projects yet.</p>`;
  }

  return relatedProjects.map((project) => `
    <a class="panel-project" href="${projectUrl(project.slug)}">
      <span class="panel-project-title">${escapeHTML(project.title)}</span>
    </a>
  `).join("");
}

function positionPanelNearInterest(interest) {
  if (!panelRoot || !graphRoot || !layoutRoot) return;

  const graphRect = graphRoot.getBoundingClientRect();
  const layoutRect = layoutRoot.getBoundingClientRect();
  const pointX = (interest.x / 100) * graphRect.width + (graphRect.left - layoutRect.left);
  const pointY = (interest.y / 100) * graphRect.height + (graphRect.top - layoutRect.top);

  panelRoot.classList.add("is-active");

  requestAnimationFrame(() => {
    const panelRect = panelRoot.getBoundingClientRect();
    const margin = 16;
    const panelWidth = panelRect.width;
    const panelHeight = panelRect.height;

    let left = pointX;
    left = Math.max(panelWidth / 2 + margin, Math.min(left, graphRect.width - panelWidth / 2 - margin));

    let top = pointY - panelHeight - 18;
    if (top < margin) top = pointY + 18;
    if (top + panelHeight > graphRect.height - margin) top = graphRect.height - panelHeight - margin;

    panelRoot.style.left = `${left}px`;
    panelRoot.style.top = `${top}px`;
    panelRoot.style.transform = "translateX(-50%)";
  });
}

function selectInterest(id) {
  const interest = interestById.get(id);
  if (!interest || !panelRoot) return;

  selectedInterestId = id;
  setInterestHighlight(id, false);

  panelRoot.innerHTML = `
    <div class="panel-projects">
      ${renderProjects(interest)}
    </div>
  `;

  positionPanelNearInterest(interest);
}

function hidePanel() {
  selectedInterestId = null;
  if (panelRoot) panelRoot.classList.remove("is-active");
  clearGraphHighlight();
}

function initGraph() {
  if (!graphRoot || !nodesRoot || !linesRoot || !panelRoot) return;

  if (!interestData.length) {
    panelRoot.innerHTML = "<p class='panel-empty'>No interests found. Check interests.js.</p>";
    panelRoot.classList.add("is-active");
    return;
  }

  calculateProjectPositions();
  renderNodes();
  drawLines();

  // DOM measurements are needed because a long tag occupies more space than a
  // short one. Resolve once after the first layout, then again after web fonts load.
  requestAnimationFrame(() => resolveNodeCollisions());

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      calculateProjectPositions();
      applyProjectPositions();
      requestAnimationFrame(() => resolveNodeCollisions());
    });
  }

  graphRoot.addEventListener("click", () => hidePanel());

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      calculateProjectPositions();
      applyProjectPositions();

      requestAnimationFrame(() => {
        resolveNodeCollisions();

        if (!selectedInterestId) return;
        const interest = interestById.get(selectedInterestId);
        if (interest) positionPanelNearInterest(interest);
      });
    }, 90);
  });
}

initGraph();
