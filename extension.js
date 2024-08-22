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
                let data = yaml.load(fileContent);
                visualizeGraph(data);
            } else {
                vscode.window.showErrorMessage('Please open a YAML file to visualize.');
            }
        }
    });

    context.subscriptions.push(disposable);
}

function visualizeGraph(data) {
    const panel = vscode.window.createWebviewPanel(
        'graphVisualization', 
        'YAML Graph Visualization', 
        vscode.ViewColumn.One, 
        {}
    );

    // Convert the YAML data to a graph structure here
    // and pass it to the webview content
    const graphData = convertYamlToGraph(data);

    panel.webview.html = getWebviewContent(graphData);
}

function convertYamlToGraph(data) {
    // Convert your YAML data to nodes and edges suitable for a graph library
    let nodes = [];
    let edges = [];
    // Implement conversion logic here

    return { nodes, edges };
}

function getWebviewContent(graphData) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Graph</title>
        <script src="https://unpkg.com/cytoscape/dist/cytoscape.min.js"></script>
    </head>
    <body>
        <div id="cy" style="width: 100%; height: 100%;"></div>
        <script>
            const cy = cytoscape({
                container: document.getElementById('cy'),
                elements: ${JSON.stringify(graphData)},
                style: [
                    {
                        selector: 'node',
                        style: {
                            'background-color': '#666',
                            'label': 'data(id)'
                        }
                    },
                    {
                        selector: 'edge',
                        style: {
                            'width': 3,
                            'line-color': '#ccc',
                            'target-arrow-color': '#ccc',
                            'target-arrow-shape': 'triangle'
                        }
                    }
                ],
                layout: {
                    name: 'grid',
                    rows: 1
                }
            });
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
