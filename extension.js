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
				if ( data.nodes !== undefined ){
					handle_visuslize_graph(context, data);
				} else {
					vscode.window.showErrorMessage('Please open a valid YAML file containing topological map.');
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
    panel.webview.html = handle_generate_webview(uris, graph_data);
}

// webview uris
function handle_different_paths(context, panel){

	const uris = { 
		cytoscape : panel.webview.asWebviewUri( vscode.Uri.joinPath(context.extensionUri, 'src/cytoscape.min.js') ),

		bootstrap_js : panel.webview.asWebviewUri( vscode.Uri.joinPath(context.extensionUri,  'src/bootstrap.min.js') ),
		bootstrap_css : panel.webview.asWebviewUri( vscode.Uri.joinPath(context.extensionUri,  'src/bootstrap.min.css') ),
		bootstrap_theme : panel.webview.asWebviewUri( vscode.Uri.joinPath(context.extensionUri,  'src/bootstrap-theme.min.css') ),

		app_js : panel.webview.asWebviewUri( vscode.Uri.joinPath(context.extensionUri,  'src/index.js') ),
		app_css : panel.webview.asWebviewUri( vscode.Uri.joinPath(context.extensionUri,  'src/style.css') ),
	}

	return uris
}

function handle_convert_yaml_to_topomap(data) {

	// convert topomap to graphs
	let graph_data = []

	graph_data = data.nodes.map( (node, index) => {
		const { x, y, z } = node.node.pose.position 
		return { 
			data :  {id : node.meta.node, node : node  },
			position : { x, y }, 
			classes : "topological_node"
		}
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
				classes : "topological_vert"
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
					classes : "topological_vert_edge"
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
						classes : "topological_vert_edge"
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
				classes : "topological_edge"
			})
		}
	}

    return graph_data;
}

function handle_generate_webview(uris, graph_data) {

	return `<!DOCTYPE html>
    <html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Graph Visualization</title>


			<script src="${uris['cytoscape']}"></script>

			<script src="${uris['bootstrap_js']}"></script>
			<link rel="stylesheet" href="${uris['bootstrap_css']}"/>

			<script src="${uris['app_js']}"></script>
			<link rel="stylesheet" href="${uris['app_css']}"/>
		</head>
		<body>
			<div id="side-bar"> 


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

				<div class="sidebar-sub-container">
					<button id="center-graph-view"> Center Graph View </button>
					<button id="export=datum-file"> Export Topological Map </button>
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

			<script>
				graph_handler.plot_graph(${JSON.stringify(graph_data)})
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
