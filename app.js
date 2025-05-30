
const width = innerWidth, height = innerHeight;
const svg = d3.select("#viz");
const viewport = svg.select('#viewport');
let zoomTransform = d3.zoomIdentity;
svg.call(
  d3.zoom().scaleExtent([0.5, 5]).on('zoom', ev => {
    zoomTransform = ev.transform;
    viewport.attr('transform', zoomTransform);
  })
);
let render = ()=>{};

const camera = { rotX: 0.3, rotY: 0.3, distance: 800 };
document.addEventListener('keydown',ev=>{
  const step=0.1;
  if(ev.key==='ArrowUp') camera.rotX-=step;
  if(ev.key==='ArrowDown') camera.rotX+=step;
  if(ev.key==='ArrowLeft') camera.rotY-=step;
  if(ev.key==='ArrowRight') camera.rotY+=step;
  if(ev.key==='w') camera.distance=Math.max(100,camera.distance-20);
  if(ev.key==='s') camera.distance+=20;
  render();
});

const simulation = d3.forceSimulation().numDimensions(3)
  .force("link", d3.forceLink().id(d=>d.id).distance(150).strength(d=>d.strength))
  .force("charge", d3.forceManyBody().strength(-120))
  .force("collide", d3.forceCollide().radius(d=>{
    if(d.type==='star') return 18;
    if(d.type==='planet') return 12;
    if(d.type==='moon') return 10;
    return 8;
  }));
Promise.all([
  "varietals.json","wine_types.json","regions.json","avas.json",
  "pizza_styles.json","toppings.json","bottles.json","links.json"
].map(d=>d3.json(d))).then(([varietals,types,regions,avas,pizzas,toppings,bottles,links])=>{
  const nodes=[...varietals,...types,...regions,...avas,...pizzas,...toppings,...bottles];
  nodes.forEach(n=>{
    n.x=(Math.random()-0.5)*width*2;
    n.y=(Math.random()-0.5)*height*2;
    n.z=(Math.random()-0.5)*400;
  });
  simulation.nodes(nodes);
  simulation.force('link').links(links);
  const nodeElems=viewport.selectAll('text').data(nodes).enter().append('text')
      .attr('class',d=>'node '+d.type).text(d=>d.emoji).attr('font-size',d=>{
        if(d.type==='star')return 20;
        if(d.type==='planet')return 16;
        if(d.type==='moon')return 14;
        return 12;
      });
  const linkElems=viewport.selectAll('line').data(links).enter().append('line').attr('class','link');
  simulation.on('tick',render);

  function project(d){
    const cosX=Math.cos(camera.rotX), sinX=Math.sin(camera.rotX);
    const cosY=Math.cos(camera.rotY), sinY=Math.sin(camera.rotY);
    let x=d.x, y=d.y, z=d.z;
    let y1=cosX*y - sinX*z;
    let z1=sinX*y + cosX*z;
    let x1=cosY*x + sinY*z1;
    z1=-sinY*x + cosY*z1;
    const p=camera.distance/(camera.distance - z1);
    return {x:x1*p, y:y1*p, scale:p};
  }

  function render(){
    nodeElems.attr('transform',d=>{
      const p=project(d); return `translate(${p.x},${p.y}) scale(${p.scale})`;
    });
    linkElems.attr('x1',d=>project(d.source).x).attr('y1',d=>project(d.source).y)
      .attr('x2',d=>project(d.target).x).attr('y2',d=>project(d.target).y);
  }
  let focus=null;
  nodeElems.on('click',(ev,d)=>{
    ev.stopPropagation();
    if(focus===d){ unfocus(); return; }
    unfocus();
    focus=d;
    const c = {
      x:(width/2 - zoomTransform.x)/zoomTransform.k,
      y:(height/2 - zoomTransform.y)/zoomTransform.k
    };
    d.fx=c.x; d.fy=c.y;
    nodeElems.filter(n=>n===d).classed('focus',true);
    // strengthen links
    simulation.force('link').strength(l=>{
      return (l.source===d||l.target===d)?Math.min(1,l.strength*2):l.strength;
    });
    simulation.alpha(0.5).restart();
  });
  function unfocus(){
    if(!focus) return;
    focus.fx=focus.fy=null;
    nodeElems.classed('focus',false);
    simulation.force('link').strength(l=>l.strength);
    simulation.alpha(0.5).restart();
    focus=null;
  }
  svg.on('click',unfocus);
  document.getElementById('reset').addEventListener('click',unfocus);
});
