/* 3-D force-directed cosmic pizza-wine explorer – conflict-free build */

const width  = innerWidth;
const height = innerHeight;

const svg      = d3.select("#viz");
const viewport = svg.select("#viewport");      // <g id="viewport"></g> inside SVG
let   zoomTransform = d3.zoomIdentity;

/* -- Zoom / pan --------------------------------------------------------- */
svg.call(
  d3.zoom()
    .scaleExtent([0.5, 5])
    .on("zoom", ev => {
      zoomTransform = ev.transform;
      viewport.attr("transform", zoomTransform);
    })
);

/* -- Camera keyboard controls ------------------------------------------ */
const camera = { rotX: 0.3, rotY: 0.3, distance: 800 };

document.addEventListener("keydown", ev => {
  const step = 0.1;
  if (ev.key === "ArrowUp")    camera.rotX -= step;
  if (ev.key === "ArrowDown")  camera.rotX += step;
  if (ev.key === "ArrowLeft")  camera.rotY -= step;
  if (ev.key === "ArrowRight") camera.rotY += step;
  // Zoom in / out
  if (ev.key === "w") camera.distance = Math.max(100, camera.distance - 20);
  if (ev.key === "s") camera.distance += 20;
  render();
});

/* -- 3-D force simulation ---------------------------------------------- */
const simulation = d3.forceSimulation().numDimensions(3)
  .force("link", d3.forceLink()
                   .id(d => d.id)
                   .distance(120)            // compromise distance
                   .strength(d => d.strength))
  .force("charge", d3.forceManyBody().strength(-120))
  .force("center", d3.forceCenter(0, 0, 0))
  .force("z",      d3.forceZ())
  .force("collide", d3.forceCollide().radius(d => {
    if (d.type === "star")     return 18;
    if (d.type === "planet")   return 12;
    if (d.type === "moon")     return 10;
    return 8;                  // asteroid default
  }));

/* -- Data load ---------------------------------------------------------- */
Promise.all([
  "varietals.json","wine_types.json","regions.json","avas.json",
  "pizza_styles.json","toppings.json","bottles.json","links.json"
].map(f => d3.json(f))).then(([varietals, types, regions, avas,
                              pizzas, toppings, bottles, links]) => {

  const nodes = [...varietals, ...types, ...regions, ...avas,
                 ...pizzas, ...toppings, ...bottles];

  /* random 3-D scatter */
  nodes.forEach(n => {
    n.x = (Math.random() - 0.5) * width  * 2;
    n.y = (Math.random() - 0.5) * height * 2;
    n.z = (Math.random() - 0.5) * 400;
  });

  simulation.nodes(nodes);
  simulation.force("link").links(links);

  /* SVG elements ------------------------------------------------------- */
  const nodeElems = viewport.selectAll("text")
      .data(nodes)
      .enter().append("text")
        .attr("class", d => `node ${d.type}`)
        .text(d => d.emoji)
        .attr("font-size", d => {
          if (d.type === "star")   return 20;
          if (d.type === "planet") return 16;
          if (d.type === "moon")   return 14;
          return 12;               // asteroid
        });

  const linkElems = viewport.selectAll("line")
      .data(links)
      .enter().append("line")
        .attr("class", "link");

  /* -- Projection helper ---------------------------------------------- */
  function project(pt) {
    const cosX = Math.cos(camera.rotX), sinX = Math.sin(camera.rotX);
    const cosY = Math.cos(camera.rotY), sinY = Math.sin(camera.rotY);

    let x = pt.x, y = pt.y, z = pt.z;

    // rotate around X
    let y1 = cosX * y - sinX * z;
    let z1 = sinX * y + cosX * z;
    // rotate around Y
    let x1 =  cosY * x + sinY * z1;
        z1 = -sinY * x + cosY * z1;

    const persp = camera.distance / (camera.distance - z1);
    return { x: x1 * persp, y: y1 * persp, scale: persp };
  }

  /* -- Main render ----------------------------------------------------- */
  function render() {
    nodeElems.attr("transform", d => {
      const p = project(d);
      return `translate(${p.x},${p.y}) scale(${p.scale})`;
    });

    linkElems
      .attr("x1", d => project(d.source).x)
      .attr("y1", d => project(d.source).y)
      .attr("x2", d => project(d.target).x)
      .attr("y2", d => project(d.target).y);
  }

  simulation.on("tick", render);

  /* -- Focus / un-focus logic ----------------------------------------- */
  let focus = null;

  nodeElems.on("click", (ev, d) => {
    ev.stopPropagation();
    if (focus === d) { unFocus(); return; }

    unFocus();
    focus = d;

    /* fix node to viewport center (respect current zoom/pan) */
    const center = {
      x: (width  / 2 - zoomTransform.x) / zoomTransform.k,
      y: (height / 2 - zoomTransform.y) / zoomTransform.k
    };
    d.fx = center.x;
    d.fy = center.y;

    nodeElems.filter(n => n === d).classed("focus", true);

    /* amplify links connected to focus node */
    simulation.force("link").strength(l =>
      (l.source === d || l.target === d) ? Math.min(1, l.strength * 2) : l.strength
    );

    simulation.alpha(0.5).restart();
  });

  svg.on("click", unFocus);

  function unFocus() {
    if (!focus) return;
    focus.fx = focus.fy = null;
    nodeElems.classed("focus", false);
    simulation.force("link").strength(l => l.strength);
    simulation.alpha(0.5).restart();
    focus = null;
  }

  /* initial draw (in case tick is slow) */
  render();
}).catch(err => console.error("Data load error:", err));

