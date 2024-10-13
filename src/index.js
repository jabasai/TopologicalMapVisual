
const TOPOLOGICAL_NODE_COLOR = "rgba(204,204,204, 0.4)";
const TOPOLOGICAL_EDGE_COLOR = "rgba(25,100,23,0.5)";
const TOPOLOGICAL_VERT_NODE_COLOR = "rgba(204,204,204, 0.4)";
const TOPOLOGICAL_VERT_EDGE_COLOR = "rgba(255,0,0,1.0)";

class GraphHandler {
  constructor() {
    this._graph_data = null;
    this._graph_other_data = null;
    this._graph = null;

    this._source_node = null;
    this._target_node = null;
    this._agent_animation = null;

    this._a_star_result = null;

    this._is_graph_rotating = false;
    this._start_x = 0;
    this._start_y = 0;
    this._initial_angle = 0;

    this.vscode = acquireVsCodeApi();
  }
 
  plot_graph(graph_data, other_data) {
    

    const make_svg = (el)=> {
        const rotation = el.data('rotation')
        const width = 200
        const height = 200
        const svg_str = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 100 100">
            <g transform="rotate(${rotation}, 50, 50)">
                <!-- Arrowhead -->
                <polygon points="50,10 90,50 50,40 10,50" style="fill:black;stroke:black;stroke-width:2"/>
                <!-- Tail -->
                <rect x="45" y="50" width="10" height="40" style="fill:black;stroke:black;stroke-width:2" />
            </g>
        </svg>
      `;
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg_str)}`;
    }

    if (this._graph) {
      return;
    }
    this._graph_other_data = other_data;
    this._graph = cytoscape({
      container: document.getElementById("cy"),
      elements: graph_data,
      style: [
        {
          selector: ".topological-node",
          style: {
            // 'background-color': TOPOLOGICAL_NODE_COLOR,  
            "label": "data(id)",
            "text-rotation": 0,
            "font-size": 0.15,
            "color": TOPOLOGICAL_NODE_COLOR,
            "height": 0.4,
            "width": 0.4, 
            'background-image': function(ele){ return  make_svg(ele) },
            "background-image-containment" : "over", 
            'background-fit': 'cover',           
            'background-width': '100%',       
            'background-height': '100%'            
          },
        },
        {
          selector: ".topological-edge",
          style: {
            "line-color": TOPOLOGICAL_EDGE_COLOR,
            "color": TOPOLOGICAL_NODE_COLOR,
            "width": 0.085,
            "label": "data(id)",
            "font-size": 0.075,
            "target-arrow-shape": "triangle",
            "target-arrow-color": "#FF00FF",
            "text-rotation": "autorotate",
          },
        },
        {
          selector: ".topological-vert",
          style: {
            "color": TOPOLOGICAL_VERT_NODE_COLOR,
            "height": 0.01,
            "width": 0.01,
          },
        },
        {
          selector: ".topological-vert-edge",
          style: {
            "line-color": TOPOLOGICAL_VERT_EDGE_COLOR,
            "width": 0.01,
          },
        },
        {
          selector: ".hidden-label",
          style: {
            "label": "",
          },
        },
        {
          selector: ".hidden-verts",
          style: {
            "label": "",
            "height": 0.0,
            "width": 0.0,
            "color": "transparent",
          },
        },
        {
          selector: ".shortest-path",
          css: {
            "background-color": "#FF0000",
            "line-color": "rgba(255,0,0,1.0)",
            "height": 0.25,
            "width": 0.25,
            "z-index": 2,
          },
        },
        {
          selector: ".visible-agent",
          css: {
            "shape": "star",
            "background-color": "#00FF00",
            "z-index": 5,
            "label": "data(id)",
            "font-size": 0.2,
            "color": TOPOLOGICAL_NODE_COLOR,
            "height": 0.5,
            "width": 0.5,
          },
        },
        {
          selector: ".hidden-agent",
          css: {
            label: "",
            height: 0.0,
            width: 0.0,
            color: "transparent",
          },
        },  
      ],
      layout: {
        name: "preset",
      },
      autolock: false,
      autoungrabify: false,
      autounselectify: false,
    });

 
    this.handle_setup_vscode_events();
    this.handle_dom_events_control_bar();
    this.handle_setup_dom_event_path_find();
    this.handle_setup_events();
  }

  handle_setup_vscode_events() {
    window.addEventListener("message", (event) => {
      const message = event.data;
      message;
    });
  }

  handle_dom_events_control_bar() {
    // input text
    const map_name = document.getElementById("map-name");
    map_name.value = this._graph_other_data.name;
    map_name.addEventListener("input", (event) => {
      this._graph_other_data.name = map_name.value;
    });

    const pointset_name = document.getElementById("pointset-name");
    pointset_name.value = this._graph_other_data.pointset;
    pointset_name.addEventListener("input", (event) => {
      this._graph_other_data.pointset = pointset_name.value;
      this._graph.nodes().forEach((i) => {
        const node = i.data("node");
        node.meta.pointset = pointset_name.value;
        i.data("data", node);
      });
    });

    const metric_map_name = document.getElementById("metric-map-name");
    metric_map_name.value = this._graph_other_data.metric_map;
    metric_map_name.addEventListener("input", (event) => {
      this._graph_other_data.metric_map = metric_map_name.value;
      this._graph.nodes().forEach((i) => {
        const node = i.data("node");
        node.meta.map = metric_map_name.value;
        i.data("data", node);
      });
    });

    const lock_screen = document.getElementById("lock");
    lock_screen.addEventListener("click", () => {
      this._graph.panningEnabled(!lock_screen.checked);
      this._graph.userPanningEnabled(!lock_screen.checked);
      this._graph.zoomingEnabled(!lock_screen.checked);
      this._graph.userZoomingEnabled(!lock_screen.checked);
    });

    const edit_graph = document.getElementById("edit");
    edit_graph.checked =
      !this._graph.autolock() && !this._graph.autoungrabify();
    edit_graph.addEventListener("click", () => {
      this._graph.autolock(!edit_graph.checked);
      this._graph.autoungrabify(!edit_graph.checked);
    });

    const hide_verts = document.getElementById("hide-vert");
    hide_verts.addEventListener("click", (event) => {
      if (event.target.checked) {
        this._graph?.nodes(".topological_vert").addClass("hidden-verts");
        this._graph?.edges(".topological_vert_edge").addClass("hidden-verts");
      } else {
        this._graph?.nodes(".topological_vert").removeClass("hidden-verts");
        this._graph
          ?.edges(".topological_vert_edge")
          .removeClass("hidden-verts");
      }
    });

    const hide_edge_names = document.getElementById("hide-edge-names");
    hide_edge_names.addEventListener("click", (event) => {
      if (event.target.checked) {
        this._graph?.edges().addClass("hidden-label");
      } else {
        this._graph?.edges().removeClass("hidden-label");
      }
    });

    const hide_node_names = document.getElementById("hide-node-names");
    hide_node_names.addEventListener("click", (event) => {
      if (event.target.checked) {
        this._graph?.nodes().addClass("hidden-label");
      } else {
        this._graph?.nodes().removeClass("hidden-label");
      }
    });

    // buttons
    const btn_center_graph = document.getElementById("center-graph-view");
    btn_center_graph.addEventListener("click", () => {
      this._graph?.fit();
    });

    const btn_export_graph = document.getElementById("export-graph-file");
    btn_export_graph.addEventListener("click", async () => {
      const fn =
        this._graph_other_data && this._graph_other_data.name
          ? `${this._graph_other_data.name}.tmap2.yaml`
          : "topological_map.tmap2.yaml";
      const nodes = this._graph.nodes();

      const last_update_dt = new Date();
      this._graph_other_data.meta.last_updated = last_update_dt
        .toLocaleString("en-US", {
          year: "numeric",
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
        .replaceAll("/", "-")
        .replaceAll(":", "-")
        .replaceAll(", ", "_");

      const datum_data = { ...this._graph_other_data, nodes: [] };

      nodes.forEach((item) => {
        const node = item.data("node");
        const position = item.position();
        if (node) {
          node.node.pose.position.x = position.x;
          node.node.pose.position.y = position.y;
          datum_data.nodes.push(node);
        }
      });

      const datum_yaml_content = jsyaml.dump(datum_data, {
        flowLevel: 100,
        lineWidth: 80,
        noCompatMode: true,
      });
      this.vscode.postMessage({
        command: "select_folder",
        content: datum_yaml_content,
        fn,
      });
    });
  }

  handle_setup_dom_event_path_find() {
    // filter nodes (remove vert-node) -> sort -> append to selector.
    const source_selector = document.getElementById("source");
    this._graph
      .nodes()
      .filter((a) => {
        return a.data("node");
      })
      .sort((a, b) => {
        if (a.id() > b.id()) {
          return 1;
        }
        if (a.id() < b.id()) {
          return -1;
        }
        return 0;
      })
      .forEach((node) => {
        const opt = document.createElement("option");
        opt.value = node.id();
        opt.innerHTML = node.id();
        source_selector.appendChild(opt);
      });

    const target_selector = document.getElementById("target");
    this._graph
      .nodes()
      .filter((a) => {
        return a.data("node");
      })
      .sort((a, b) => {
        if (a.id() > b.id()) {
          return 1;
        }
        if (a.id() < b.id()) {
          return -1;
        }
        return 0;
      })
      .forEach((node) => {
        const opt = document.createElement("option");
        opt.value = node.id();
        opt.innerHTML = node.id();
        target_selector.appendChild(opt);
      });

    const find_path_btn = document.getElementById("find-path");
    find_path_btn.addEventListener("click", () => {
      if (this._agent_animation) {
        this._agent_animation.stop();
        this._graph.$(`#agent`).addClass("hidden-agent");
        this._graph.$(`#agent`).removeClass("visible-agent");
      }

      this._graph.nodes().removeClass("shortest-path");
      this._a_star_result?.path?.removeClass("shortest-path");

      this._source_node = this._graph.getElementById(source_selector.value);
      this._target_node = this._graph.getElementById(target_selector.value);
      this._a_star_result = this._graph
        .elements()
        .aStar({ root: this._source_node, goal: this._target_node });

      if (this._a_star_result.found) {
        this._a_star_result.path?.addClass("shortest-path");
        const path_nodes = this._a_star_result.path
          .nodes()
          .map((node) => node.position());
        const node_id = "agent";

        const fn_animate_node_on_path = (agent_id, path, duration) => {
          let current_index = 0;
          this._graph.$(`#${agent_id}`).removeClass("hidden-agent");
          this._graph.$(`#${agent_id}`).addClass("visible-agent");
          this._graph.$(`#${agent_id}`).position(path[current_index]);

          const fn_move_to_next_node = () => {
            if (current_index < path.length - 1) {
              const start = path[current_index];
              const end = path[current_index + 1];

              this._agent_animation = this._graph.$(`#${agent_id}`).animate(
                {
                  position: end,
                },
                {
                  duration: duration,
                  easing: "ease-in-out",
                  complete: () => {
                    current_index++;
                    fn_move_to_next_node();
                  },
                }
              );
            } else {
              current_index = 0;
              this._graph.$(`#${agent_id}`).position(path[current_index]);
              fn_move_to_next_node();
            }
          };

          fn_move_to_next_node();
        };

        fn_animate_node_on_path("agent", path_nodes, 1000); // 1000ms (1 second) per node
      }
    });

    const clear_path_btn = document.getElementById("clear-path");
    clear_path_btn.addEventListener("click", () => {
      this._a_star_result?.path?.removeClass("shortest-path");
      if (this._agent_animation) {
        this._agent_animation.stop();
        this._graph.$(`#agent`).addClass("hidden-agent");
        this._graph.$(`#agent`).removeClass("visible-agent");
      }
    });
  }

  handle_setup_events() {
    this._graph.on("position", ".topological-node", (event) => {
      const node = event.target;
      this.handle_show_node_modal(node);
      this.handle_move_node_verts(node);
    });

    this._graph.on("position", ".topological-vert", (event) => {
      const node = event.target;
      this.handle_update_node_vert(node);
    });

    this._graph.on("dragfreeon", "node", (event) => {
      this.handle_hide_node_modal();
    });
  }

  // Function to show modal and update its content
  handle_show_node_modal(node) {
    const { x, y } = node.position();
    const modal = document.getElementById("node-modal");
    modal.style.display = "block";

    const edges = node.data("node").node.edges;
    const rotation = node.data("rotation")
    const yaw_tolerance = node.data("node").node.properties.yaw_goal_tolerance
    const position_tolerance = node.data("node").node.properties.xy_goal_tolerance
    const edges_html = edges
      .map((e) => {
        return `<li> ${e.edge_id} </li>`;
      })
      .join(" ");

    modal.innerHTML = `
            <b>Node ID:</b> ${node.id()} <br>
            <b>Pose:</b> (${x.toFixed(4)}, ${y.toFixed(4)}, ${rotation.toFixed(1)}°)<br>
            <b>Tolerances:</b> (${position_tolerance}-m, ${yaw_tolerance}°) <br>
            <b>Edges:</b><ol>${edges_html}</ol>
        `;

    // Update modal position to follow the node
    modal.style.left = `${parseInt(node.renderedPosition().x) + 10}px`;
    modal.style.top = `${parseInt(node.renderedPosition().y) - 20}px`;
  }

  // node: topo-node
  handle_move_node_verts(node) {
    const node_id = node.id();
    const node_data = node.data("node");
    const verts = node_data.node.verts;

    const { x, y } = node.position();
    for (let index = 0; index < verts.length; index++) {
      const vert = verts[index];
      const id = `${node_id}_${index}`;
      const vert_node = this._graph.getElementById(id);
      if (vert_node) {
        vert_node.position({
          x: x + vert.x,
          y: y + vert.y,
        });
      }
    }
  }

  // node: vert-node
  handle_update_node_vert(node) {
    const node_id = node.id();

    if (node_id.split("_").length === 2) {
      const parent_node_id = node_id.split("_")[0];
      const child_vert_id = node_id.split("_")[1];

      const parent_node = this._graph?.getElementById(parent_node_id);
      const parent_node_data = parent_node?.data("node");
      const parent_position = parent_node.position();
      const child_position = node.position();

      parent_node_data.node.verts[parseInt(child_vert_id)] = {
        x: child_position.x - parent_position.x,
        y: child_position.y - parent_position.y,
      };
      parent_node.data("node", parent_node_data);
    }
  }

  handle_hide_node_modal() {
    document.getElementById("node-modal").style.display = "none";
  }
}

const graph_handler = new GraphHandler();
