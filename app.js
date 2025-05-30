
const width = innerWidth, height = innerHeight;
const svg = d3.select("#viz");
const simulation = d3.forceSimulation()
  .force("link", d3.forceLink().id(d=>d.id).distance(120).strength(d=>d.strength))
  .force("charge", d3.forceManyBody().strength(-80))
  .force("center", d3.forceCenter(width/2,height/2))
  .force("collide", d3.forceCollide().radius(d=>{
    if(d.type==='star') return 18;
    if(d.type==='planet') return 12;
    if(d.type==='moon') return 10;
    return 8;
  }));
Promise.all([
  'varietals.json','wine_types.json','regions.json','avas.json',
  'pizza_styles.json','toppings.json','bottles.json','links.json'
].map(d=>d3.json(d))).then(([varietals,types,regions,avas,pizzas,toppings,bottles,links])=>{
  const nodes=[...varietals,...types,...regions,...avas,...pizzas,...toppings,...bottles];
  simulation.nodes(nodes);
  simulation.force('link').links(links);
  const nodeElems=svg.selectAll('text').data(nodes).enter().append('text')
      .attr('class',d=>'node '+d.type).text(d=>d.emoji).attr('font-size',d=>{
        if(d.type==='star')return 20;
        if(d.type==='planet')return 16;
        if(d.type==='moon')return 14;
        return 12;
      });
  const linkElems=svg.selectAll('line').data(links).enter().append('line').attr('class','link');
  simulation.on('tick',()=>{
    nodeElems.attr('x',d=>d.x).attr('y',d=>d.y);
    linkElems.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y)
      .attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);
  });
  let focus=null;
  nodeElems.on('click',(ev,d)=>{
    ev.stopPropagation();
    if(focus===d){ unfocus(); return; }
    unfocus();
    focus=d; d.fx=width/2; d.fy=height/2;
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
