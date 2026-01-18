const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function activate(context) {
    let disposable = vscode.commands.registerCommand('extension.showGraph', function () {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const filePath = document.fileName;

            if (path.extname(filePath) === '.yaml' || 
				path.extname(filePath) === '.yml' || 
				path.extname(filePath) === '.tmap2'
					) {
                const fileContent = document.getText();
                const data = yaml.load(fileContent);
				// console.log( data )
				if ( data.nodes !== undefined ){
					handle_visuslize_graph(context, data);
				} else {
					vscode.window.showErrorMessage('Please open a valid YAML file containing topological map. Test');
				}
            } else {
                vscode.window.showErrorMessage('Please open a YAML file to visualize.');
            }
        }
    });

    context.subscriptions.push(disposable);
}

function handle_visuslize_graph(context, data) {
    const panel = vscode.window.createWebviewPanel(
        'graphVisualization', 
        'Topological Map Visualization', 
        vscode.ViewColumn.One, 
        {enableScripts: true,}
    );

	const uris = handle_different_paths(context, panel)
    const graph_data = handle_convert_yaml_to_topomap(data);
	const other_data = { meta : data.meta, metric_map : data.metric_map, name : data.name, pointset : data.pointset, transformation : data.transformation }
    panel.webview.html = handle_generate_webview(uris, graph_data, other_data);

	panel.webview.onDidReceiveMessage( 
		async message => {
			if (message.command === "select_folder" ){
				const uri = await vscode.window.showOpenDialog({
					canSelectFolders: true,
					canSelectFiles: false,
					canSelectMany: false
				});

				if (uri && uri[0]) {
					const fn = message.fn 
					const content = message.content 
					const folderUri = uri[0].fsPath
					const filePath = path.join(folderUri, fn);
					fs.writeFileSync(filePath, content);
					vscode.window.showInformationMessage('File saved successfully in ' + filePath);
				}
			}
		}
	)
}
 
// webview uris
function handle_different_paths(context, panel){

	const uris = { 
		cytoscape : panel.webview.asWebviewUri( vscode.Uri.joinPath(context.extensionUri, 'src/cytoscape.min.js') ),
		
		bootstrap_js : panel.webview.asWebviewUri( vscode.Uri.joinPath(context.extensionUri,  'src/bootstrap.min.js') ),
		bootstrap_css : panel.webview.asWebviewUri( vscode.Uri.joinPath(context.extensionUri,  'src/bootstrap.min.css') ),
		bootstrap_theme : panel.webview.asWebviewUri( vscode.Uri.joinPath(context.extensionUri,  'src/bootstrap-theme.min.css') ),

		jsyaml_js : panel.webview.asWebviewUri( vscode.Uri.joinPath(context.extensionUri,  'node_modules/js-yaml/dist/js-yaml.min.js') ),


		app_js : panel.webview.asWebviewUri( vscode.Uri.joinPath(context.extensionUri,  'src/index.js') ),
		app_css : panel.webview.asWebviewUri( vscode.Uri.joinPath(context.extensionUri,  'src/style.css') ),
	}

	return uris
}

function handle_convert_quat_to_euler(q){
	const w = q.w;  
	const x = q.x; 
	const y = q.y;  
	const z = q.z;  
  
	const sinr_cosp = 2 * (w * x + y * z);
	const cosr_cosp = 1 - 2 * (x * x + y * y);
	const roll = Math.atan2(sinr_cosp, cosr_cosp);
  
	const sinp = 2 * (w * y - z * x);
	const pitch = Math.abs(sinp) >= 1 ? Math.sign(sinp) * (Math.PI / 2) : Math.asin(sinp);
  
	const siny_cosp = 2 * (w * z + x * y);
	const cosy_cosp = 1 - 2 * (y * y + z * z);
	const yaw = Math.atan2(siny_cosp, cosy_cosp);
  
	const angles =  {
	  roll: roll* 180 / Math.PI,   
	  pitch: pitch* 180 / Math.PI,  
	  yaw: yaw * 180 / Math.PI     
	};
 
	return angles 
}

function handle_convert_yaml_to_topomap(data) {

	// convert topomap to graphs
	let graph_data = []

	graph_data = data.nodes.map( (node, index) => {
		const { x, y, z } = node.node.pose.position 
		return { 
			data :  {id : node.meta.node, node : node, rotation: handle_convert_quat_to_euler(node.node.pose.orientation).yaw + 90 },
			position : { x, y  }, 
			classes : "topological-node"
		}
	})

	// add agent 
	graph_data.push({
		data : { id : "agent" }, 
		position : { x: data.nodes[0].node.pose.position.x, y : data.nodes[0].node.pose.position.y  } , 
		classes : "hidden-agent"
	})

	// add the vertices 
	data.nodes.forEach( (node )=> {
		const { x, y } = node.node.pose.position 
		const node_id = node.meta.node
		const verts = node.node.verts 
		for ( let i = 0; i < verts.length; i++ ){
			const vert = verts[i]
			graph_data.push( { 
				data : {id : `${node_id}_${i}`, }, 
				position : { x :  x + vert.x, y : y + vert.y },
				classes : "topological-vert"
			})

			if ( i > 0 ) {
				let i_prev = i - 1
				graph_data.push( { 
					data : {
						id : `${node_id}_${i}_${i_prev}`, 
						source : `${node_id}_${i}`, 
						target : `${node_id}_${i_prev}`,
						weight : 1
					}, 
					classes : "topological-vert-edge"
				})
				
				if  (i === verts.length - 1 ){
					i_prev = 0
					graph_data.push( { 
						data : {
							id : `${node_id}_${i}_${i_prev}`, 
							source : `${node_id}_${i}`, 
							target : `${node_id}_${i_prev}`,
							weight : 1
						}, 
						classes : "topological-vert-edge"
					})
				}
			}
		}
	})


	// for edges 
	for ( let i = 0; i < data.nodes.length; i++ ){
		const node = data.nodes[i] 
		for ( let j = 0; j < node.node.edges.length; j++ ){
			const edge = node.node.edges[j] 
			graph_data.push( { 
				data : {
					id : edge.edge_id, 
					source : node.meta.node,
					target : edge.node, 
					edge : edge ,
					weight: 1,
				}, 
				classes : "topological-edge"
			})
		}
	}

    return graph_data;
}

function handle_generate_webview(uris, graph_data, other_data) {

	return `<!DOCTYPE html>
    <html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Graph Visualization</title>


			<script src="${uris['cytoscape']}"></script>
			
			<script src="${uris['jsyaml_js']}"></script>
			<script src="${uris['bootstrap_js']}"></script>
			
			<link rel="stylesheet" href="${uris['bootstrap_css']}"/>

			<script src="${uris['app_js']}"></script>
			<link rel="stylesheet" href="${uris['app_css']}"/>
		</head>
		<body>
			<div id="side-bar"> 

				<div class="sidebar-sub-container-1">
					<div class='form-group'>
						<label for="map-name"> Map Name </label>
						<input type="text" id="map-name"  >
					</div>
					<div class='form-group'>
						<label for="pointset-name"> Pointset Name </label>
						<input type="text" id="pointset-name"   >
					</div>					
					<div class='form-group'>
						<label for="metric-map-name"> Metric Map Name </label>
						<input type="text" id="metric-map-name"   >
					</div>
				</div>


				<div class="sidebar-sub-container">
					<input type="checkbox" id="lock" name="lock" >
					<label for="lock"> Lock View</label>
					<input type="checkbox" id="edit" name="edit" >
					<label for="edit"> Edit Graph</label>
					<input type="checkbox" id="hide-vert" name="hide-vert" >
					<label for="hide-vert"> Hide Verts </label>
					<br>

					<input type="checkbox" id="hide-edge-names" name="hide-edge-names" >
					<label for="hide-edge-names"> Hide Edge Labels</label>
					
					<input type="checkbox" id="hide-node-names" name="hide-node-names" >
					<label for="hide-node-names"> Hide Node Labels</label>
					<br>
				</div>

				<div class="sidebar-sub-container-1">
					<div class='form-group'>
						<label for="node-x"> Selected Node dX</label>
						<input type="number" id="node-x" step="0.1" name="node-x" >
					</div>
					<div class='form-group'>
						<label for="node-y"> Selected Node dY</label>
						<input type="number" id="node-y" step="0.1" name="node-y" >
					</div>
					<div class='form-group'>
						<label for="node-angle"> Selected Node Angles</label>
						<input type="number" min="0" max="360" step="0.1" id="node-angle" name="node-angle" >
					</div>
				</div>

				<div class="sidebar-sub-container">
					<button id="center-graph-view"> Center Graph View </button>
					<button id="export-graph-file"> Export Topological Map </button>
				</div>


				<div class="sidebar-sub-container">
					<label for="source">Source node:</label>
					<select name="source" id="source">
					</select>

					<label for="target">Target node:</label>
					<select name="target" id="target">
					</select>
					<br>

					<div>
						<button id="find-path"> Find Path </button>
						<button id="clear-path"> Clear Path </button>
					</div>

				</div>
				
			</div>

			<div id="node-modal" class="node-modal"></div>
			<div id="cy" style="width: 100%; height: 100%;"></div>
 
			<svg id="xy-axis" width="200" height="200" xmlns="http://www.w3.org/2000/svg">
				<line x1="10" y1="10" x2="100" y2="10" stroke="black" stroke-width="5"/>
				<line x1="10" y1="10" x2="10" y2="100" stroke="black" stroke-width="5"/>
			</svg>
			
			<script>
				graph_handler.plot_graph(${JSON.stringify(graph_data)}, ${JSON.stringify(other_data)})
			</script>
		</body>
    </html>`;
}

exports.activate = activate;

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
