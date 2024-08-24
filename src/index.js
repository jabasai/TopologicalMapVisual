class GraphHandler
{
    constructor(){
        this._graph_data = null
        this._graph = null

        this._source_node = null
        this._target_node = null

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
                    selector: 'node',
                    style: {
                        'background-color': '#666',
                        'label': 'data(id)',
                        'text-rotation' : 0,
                        'font-size' : 0.15,
                        'color' : 'rgba(204,204,204, 0.4)',
                        'height' : 0.2, 
                        'width' : 0.2,
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 0.05,
                        'line-color': 'rgba(25,100,23,0.5)',
                    }
                },
                {
                    selector: ':selected',
                    css: {
                        'background-color': '#00FF00',
                        'line-color': 'rgba(255,0,0,1.0)',
                        'height' : 0.1, 
                        'width' : 0.1,
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
        this.handle_dom_events()
    }

    handle_dom_events()
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

        const source_selector = document.getElementById('source')
        this._graph.nodes().forEach(node => {
            const opt = document.createElement('option');
            opt.value = node.id();
            opt.innerHTML = node.id();
            source_selector.appendChild(opt);
        })  

        const target_selector = document.getElementById('target')
        this._graph.nodes().forEach(node => {
            const opt = document.createElement('option');
            opt.value = node.id();
            opt.innerHTML = node.id();
            target_selector.appendChild(opt);
        })  

        const find_path_btn = document.getElementById("find-path")
        find_path_btn.addEventListener( 'click', ()=>{
            this._graph.elements().filter( i => { return i.selected() }).unselect()
            this._source_node = this._graph.getElementById(source_selector.value)
            this._target_node = this._graph.getElementById(target_selector.value)
            const a_start_results = this._graph.elements().aStar({ root: this._source_node, goal: this._target_node });
            a_start_results.path.select()

        })
        
        const clear_path_btn = document.getElementById("clear-path")
        clear_path_btn.addEventListener( 'click', ()=>{
            this._graph.elements().filter( i => { return i.selected() }).unselect()
        })
    }


    handle_setup_events()
    { 
        this._graph.on('mousedown', (event) => {
            if (event.originalEvent.shiftKey) { // Hold Shift to rotate
                this._is_graph_rotating = true;
                this._start_x = event.originalEvent.clientX;
                this._start_y = event.originalEvent.clientY;
            }
        });
        
        this._graph.on('mousemove', (event) => {
            if (this._is_graph_rotating) {
                const currentX = event.originalEvent.clientX;
                const currentY = event.originalEvent.clientY;
                const deltaX = currentX - this._start_x;
                const deltaY = currentY - this._start_y;
                const angle = Math.atan2(deltaY, deltaX);
                const rotateBy = angle - this._initial_angle;
                this._initial_angle = angle;
                this._start_x = currentX;
                this._start_y = currentY;
            }
        });
        
        this._graph.on('mouseup', () => {
            if (this._is_graph_rotating) {
                this._is_graph_rotating = false;
            }
        });
    }

}


const graph_handler = new GraphHandler()