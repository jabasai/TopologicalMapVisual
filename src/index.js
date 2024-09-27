const TOPOLOGICAL_NODE_COLOR = "rgba(204,204,204, 0.4)"
const TOPOLOGICAL_EDGE_COLOR = "rgba(25,100,23,0.5)"
const TOPOLOGICAL_VERT_NODE_COLOR = "rgba(204,204,204, 0.4)"
const TOPOLOGICAL_VERT_EDGE_COLOR = "rgba(255,0,0,1.0)"

class GraphHandler
{
    constructor(){
        this._graph_data = null
        this._graph = null

        this._source_node = null
        this._target_node = null

        this._a_start_result = null

        this._is_graph_rotating = false 
        this._start_x = 0 
        this._start_y = 0 
        this._initial_angle = 0 
    }
 
    plot_graph(graph_data){

        if ( this._graph ) { return }
        this._graph = cytoscape({
            container: document.getElementById('cy'),
            elements: graph_data,
            style: [
                {
                    selector: '.topological_node',
                    style: {
                        'background-color': TOPOLOGICAL_NODE_COLOR, //'#666',
                        'label': 'data(id)',
                        'text-rotation' : 0,
                        'font-size' : 0.15,
                        'color' : TOPOLOGICAL_NODE_COLOR,
                        'height' : 0.2, 
                        'width' : 0.2,
                    }
                },
                {
                    selector: '.topological_edge',
                    style: {
                        'line-color': TOPOLOGICAL_EDGE_COLOR,
                        'color' : TOPOLOGICAL_NODE_COLOR,
                        'width': 0.085,
                        'label': 'data(id)',
                        'font-size' : 0.075,
                        'target-arrow-shape': 'triangle',
                        'text-rotation': 'autorotate',   

                    }
                },
                {
                    selector: '.topological_vert',
                    style: {
                        'color' : TOPOLOGICAL_VERT_NODE_COLOR,
                        'height' : 0.01, 
                        'width' : 0.01,
                    }
                },
                {
                    selector: '.topological_vert_edge',
                    style: {
                        'line-color': TOPOLOGICAL_VERT_EDGE_COLOR,
                        'width': 0.01,
                    }
                },
                {
                    selector: '.hidden-label',
                    style: {
                        'label': '' 
                    }
                },
                {
                    selector: '.hidden-verts',
                    style: {
                        'label': '',
                        'height' : 0.0, 
                        'width' : 0.0,
                        'color' : "transparent",
                    }
                },
                {
                    selector: '.shortest-path',
                    css: {
                        'background-color': '#FF0000',
                        'line-color': 'rgba(255,0,0,1.0)',
                        'height' : 0.25, 
                        'width' : 0.25,
                        "z-index" : 2
                    }
                }
            ],
            layout: {
                name: 'preset'  
            },
            autolock: true,
            autoungrabify: true,
            autounselectify: false,
        });

        this.handle_setup_events()
        this.handle_dom_events_control_bar()
        this.handle_setup_dom_event_path_find()
    }

    handle_dom_events_control_bar()
    {
        const lock_screen = document.getElementById("lock")
        lock_screen.addEventListener('click', ()=>{
            this._graph.panningEnabled( !lock_screen.checked )
            this._graph.userPanningEnabled( !lock_screen.checked )
            this._graph.zoomingEnabled( !lock_screen.checked )
            this._graph.userZoomingEnabled( !lock_screen.checked )
        })


        const edit_graph = document.getElementById("edit")
        edit_graph.addEventListener('click', ()=>{
            this._graph.autolock( !edit_graph.checked )
            this._graph.autoungrabify( !edit_graph.checked )
        })

        const hide_verts = document.getElementById("hide-vert")
        hide_verts.addEventListener("click", (event)=> {
            
            if ( event.target.checked ){
                this._graph?.nodes('.topological_vert').addClass("hidden-verts")
                this._graph?.edges('.topological_vert_edge').addClass("hidden-verts")
            } else { 
                this._graph?.nodes('.topological_vert').removeClass("hidden-verts")
                this._graph?.edges('.topological_vert_edge').removeClass("hidden-verts")
            }

        })

        const hide_edge_names = document.getElementById("hide-edge-names")
        hide_edge_names.addEventListener("click", (event)=> {
            if ( event.target.checked ){
                this._graph?.edges().addClass("hidden-label")
            } else { 
                this._graph?.edges().removeClass("hidden-label")
            }
        })

        const hide_node_names = document.getElementById("hide-node-names")
        hide_node_names.addEventListener("click", (event)=> {
            if ( event.target.checked ){
                this._graph?.nodes().addClass("hidden-label")
            } else { 
                this._graph?.nodes().removeClass("hidden-label")
            }
        })


        // buttons 
        const btn_center_graph = document.getElementById("center-graph-view")
        btn_center_graph.addEventListener("click",  ()=>{
            this._graph?.fit()
        })



    }

    handle_setup_dom_event_path_find()
    {
        // filter nodes (remove vert-node) -> sort -> append to selector.
        const source_selector = document.getElementById('source')
        this._graph.nodes()
        .filter( (a)=> { return a.data('node') })
        .sort( (a, b)=> {  
            if ( a.id() > b.id() ) { return 1 }
            if ( a.id() < b.id() ) { return -1 }
            return 0;
        })
        .forEach(node => {
            const opt = document.createElement('option');
            opt.value = node.id();
            opt.innerHTML = node.id();
            source_selector.appendChild(opt);
        })  

        const target_selector = document.getElementById('target')
        this._graph.nodes()
        .filter( (a)=> { return a.data('node') })
        .sort( (a, b)=> {  
            if ( a.id() > b.id() ) { return 1 }
            if ( a.id() < b.id() ) { return -1 }
            return 0;
        })
        .forEach(node => {
            const opt = document.createElement('option');
            opt.value = node.id();
            opt.innerHTML = node.id();
            target_selector.appendChild(opt);
        })  

        const find_path_btn = document.getElementById("find-path")
        find_path_btn.addEventListener( 'click', ()=>{
            this._graph.nodes().removeClass("shortest-path")
            this._a_start_result?.path?.removeClass("shortest-path")

            this._source_node = this._graph.getElementById(source_selector.value)
            this._target_node = this._graph.getElementById(target_selector.value)
            this._a_start_result = this._graph.elements().aStar({ root: this._source_node, goal: this._target_node });
            if ( this._a_start_result.found ) {
                this._a_start_result.path?.addClass("shortest-path")
            }
        })
        
        const clear_path_btn = document.getElementById("clear-path")
        clear_path_btn.addEventListener( 'click', ()=>{
            this._a_start_result?.path?.removeClass("shortest-path")
        })
    }


    handle_setup_events()
    { 

        this._graph.on("position", ".topological_node", (event)=> {
            const node = event.target 
            this.handle_show_node_modal(node)
            this.handle_move_node_verts(node)
        })

        this._graph.on("position", ".topological_vert", (event)=> {
            const node = event.target 
            this.handle_update_node_vert(node)
        })

        this._graph.on('dragfreeon', 'node', (event)=> {
            this.handle_hide_node_modal();
        });
    }


    // Function to show modal and update its content
    handle_show_node_modal(node) {

        const { x, y } = node.position()
        const modal = document.getElementById('node-modal');
        modal.style.display = 'block';

        const edges = node.data("node").node.edges 
        const edges_html = edges.map((e)=> { return `<li> ${e.edge_id} </li>`}).join(" ")

        modal.innerHTML = `
            <b>Node ID:</b> ${node.id()} <br>
            <b>Position (xy):</b>  ${x.toFixed(4)}  Y: ${y.toFixed(4)} <br>
            <b>Edges:</b>${edges_html}
        `;
    
        // Update modal position to follow the node
        modal.style.left = `${parseInt(node.renderedPosition().x) + 10}px`; 
        modal.style.top = `${parseInt(node.renderedPosition().y) - 20}px`;
    }
    

    // node: topo-node
    handle_move_node_verts(node){

        const node_id = node.id()
        const node_data = node.data("node")
        const verts = node_data.node.verts 

        const { x, y } = node.position()
        for ( let index = 0; index < verts.length ; index ++ ){
            const vert = verts[index]
            const id = `${node_id}_${index}`
            const vert_node = this._graph.getElementById(id)
            if ( vert_node ) { 
                vert_node.position({
                    x : x + vert.x, 
                    y : y + vert.y
                })
            }
        }
    }

    // node: vert-node
    handle_update_node_vert(node){
        const node_id = node.id()

        if ( node_id.split("_").length === 2 ){
            
            const parent_node_id = node_id.split("_")[0]
            const child_vert_id =  node_id.split("_")[1]

            const parent_node = this._graph?.getElementById(parent_node_id)
            const parent_node_data = parent_node?.data('node')
            const parent_position = parent_node.position()
            const child_position = node.position()

            parent_node_data.node.verts[ parseInt(child_vert_id) ] = { x : child_position.x - parent_position.x, y : child_position.y - parent_position.y }
            parent_node.data( 'node', parent_node_data )
        }
    }

    handle_hide_node_modal(){
        document.getElementById('node-modal').style.display = 'none';
    }
}


const graph_handler = new GraphHandler()