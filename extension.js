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

            if (path.extname(filePath) === '.yaml' || path.extname(filePath) === '.yml') {
                const fileContent = document.getText();
                const data = yaml.load(fileContent);

				if ( data.nodes !== undefined ){
					const lib_path = vscode.Uri.joinPath(context.extensionUri, 'cytoscape.min.js');
					handle_visuslize_graph(lib_path, data);
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

function handle_visuslize_graph(lib_path, data) {
    const panel = vscode.window.createWebviewPanel(
        'graphVisualization', 
        'Topological Map Visualization', 
        vscode.ViewColumn.One, 
        {enableScripts: true,}
    );

	const lib_uri = panel.webview.asWebviewUri(lib_path);
    const graphData = handle_convert_yaml_to_topomap(data);
    panel.webview.html = handle_generate_webview(lib_uri, graphData);
}

function handle_convert_yaml_to_topomap(data) {

	// convert topomap to graphs
	let graph_data = []

	graph_data = data.nodes.map( (node, index) => {
		const { x, y, z } = node.node.pose.position 
		return { 
			data :  {id : node.meta.node, },
			position : { x : -1*x, y }
		}
	})

	for ( let i = 0; i < data.nodes.length; i++ ){
		const node = data.nodes[i] 
		for ( let j = 0; j < node.node.edges.length; j++ ){
			const edge = node.node.edges[j] 
			graph_data.push( { data : {
				id : edge.edge_id, 
				source : node.meta.node,
				target : edge.node
			} } )
		}
	}

    return graph_data;
}

function handle_generate_webview(lib_uri, graphData) {

	return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Graph</title>
	    <script src="${lib_uri}"></script>
	</head>
    <body>
		<div id="instructions"> 
			Use your mouse to zoom in and out or pan the graph.
		</div>
        <div id="cy" style="width: 100%; height: 100%;"></div>
        <script>
            var cy = cytoscape({
				container: document.getElementById('cy'),
				elements: ${JSON.stringify(graphData)},
				style: [
					{
						selector: 'node',
						style: {
							'background-color': '#666',
							'label': 'data(id)',
							'font-size' : 0.25,
							'height' : 0.25, 
							'width' : 0.25
						}
					},
					{
						selector: 'edge',
						style: {
							'width': 0.15,
							'line-color': '#ccc',
							'target-arrow-color': '#ccc',
							'target-arrow-shape': 'triangle'
						}
					}
				],
				layout: {
					name: 'preset'  
				}
			});
			cy.center()

        </script>
		<style>
			#instructions { 
				width : 10%;
				height : 5%;
				position: absolute;
				top  : 0px;
				right : 40px ; 
				font-size: 12px;

				background: rgba(255, 255, 255, 0.2);
				backdrop-filter: blur(5px);
				-webkit-backdrop-filter: blur(5px);
				border: 1px solid rgba(255, 255, 255, 0.3);
			}

			#cy {
				width: 100%;
				height: 100%;
				position: absolute; 
				top: 0px;
				left: 0px;
			}
		</style>

    </body>
    </html>`;
}

exports.activate = activate;

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
