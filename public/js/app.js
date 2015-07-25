/* 
* @Author: Katrina Uychaco
* @Date:   2015-07-21 16:54:34
* @Last Modified by:   Katrina Uychaco
* @Last Modified time: 2015-07-24 18:30:24
*/

'use strict';

// EventEmitter-like object
var socket = io();

socket.on('connect', function() {
  console.log('connection!');
});

// For neural nets pushed to client, update visualization weights and results
socket.on('brain', function(result) {
  //console.log('#############\n ', result.networkNum, '\n', result.iterations, '\n', result.error, '\n', result.brain);
  
  // Update paths between nodes when new weights are provided
  var weights = flattenBrainWeights(result.brain);
  update(result, weights);
  
});

// On form submission visualize and train neural networks
$(document).ready(function() {
  $('form').submit(function(e) {
    
    e.preventDefault();

    $('svg g').empty();

    var formDataString = ',[' + $('#hiddenLayers2').val() + '],[' + $('#hiddenLayers3').val() + '],[' + $('#hiddenLayers4').val() + ']]';

    var formData = {
      'hiddenLayers1': '[' + $('#hiddenLayers1').val() + ']',
      'hiddenLayers2': '[' + $('#hiddenLayers2').val() + ']',
      'hiddenLayers3': '[' + $('#hiddenLayers3').val() + ']',
      'hiddenLayers4': '[' + $('#hiddenLayers4').val() + ']'
    };

    //console.log('formData:', formData);
    
    // Render neural network architecture
    for (var i=1; i<=4; i++) {
      
      // Render nodes
      var nodePositions = calculateNodePositions(i);
      //console.log('positions for net',i,':', nodePositions);
      // flatten nodePositions array
      var flattenedNodePositions = nodePositions.reduce(function(result, layer) {
        return result.concat(layer);
      }, []);

      // Render links
      var links = generateLinkObjects(nodePositions);

      //console.log('links for net',i,':',links);
      
      visualize(i, flattenedNodePositions, links);

    }

    socket.emit('train', formData);
    $('#hiddenLayers').val('');
    //console.log('train brains!');

  });

});

// Options to control display of networks
var displayOptions = {
  width: 960,
  height: 640,
  verticalOffset: 160,
  margin: 50
};

// Calculate x,y coordinates of nodes in each network
var calculateNodePositions = function(networkNum) {
  // Parse the values in the input forms to get the array of nodes for each network
  // Add elements for nodes in input layer and output layer
  var network1NodeList = [2].concat($('#hiddenLayers'+networkNum).val().split(',').map(Number),[0]);


  // If no input was provided default to a single hidden layer of 10 nodes
  // network1NodeList[1] = network1NodeList[1] === 0 ? 5 : network1NodeList[1];
  if (network1NodeList[1] === 0) {
    switch (networkNum) {
      case 1: network1NodeList.splice(1,1,3); break; 
      case 2: network1NodeList.splice(1,1,3,3); break;
      case 3: network1NodeList.splice(1,1,5); break;
      case 4: network1NodeList.splice(1,1,3,5); break;
    }
  }

  // Add one to each layer to account for bias nodes
  network1NodeList = network1NodeList.map(function(elem){
    return elem + 1;
  });
  console.log(network1NodeList);
  
  var separation = ((displayOptions.width/4) - (2 * displayOptions.margin)) / (network1NodeList.length-1);
  //console.log('horizontal separation:', separation);

  // Calculate the x-coordinates for each layer in network 1
  var network1XCoordinates = [];
  
  network1NodeList.forEach(function(elem, index) {
    var xCoordinate = Math.round((index * separation) + displayOptions.margin);
    network1XCoordinates.push(xCoordinate);
  });

  //console.log(network1XCoordinates);

  // Calculate the y-coordinates for each layer in network 1
  var network1YCoordinates = [];
  
  network1NodeList.forEach(function(elem, index) {
    // Each element represents a layer
    // For each layer use the number of nodes in the layer to determine the separation between each node
    var separation = (displayOptions.height / (elem + 1));
    //console.log('vertical separation:', separation);

    // Generate the y-coordinate for each node in the layer
    var layerYCoordinates = [];
    for(var i = 1; i <= elem; i++) {
      var yCoordinate = Math.round(i * separation);
      layerYCoordinates.push(yCoordinate);
    }
    //console.log('layer', index+1);
    //console.log('y-coordinates for layer', layerYCoordinates);

    network1YCoordinates.push(layerYCoordinates);
  });

  //console.log('network1YCoordinates:', network1YCoordinates);

  // Create a 2D array of coordinates for each node in the network
  return generateNodeCoordinates(network1XCoordinates, network1YCoordinates);

};

// Given arrays for the x-coordinates and y-coordinates of all of the nodes in a network
// Generate a 2D array of coordinates for each node
var generateNodeCoordinates = function(xCoordinates, yCoordinates) {
  return yCoordinates.map(function(layer, layerNum) {
    return layer.map(function(yLoc) {
      return { x: xCoordinates[layerNum], y: yLoc };
    });
  });
};

// Given node positions, generate link objects with source and target nodes
var generateLinkObjects = function(nodePositions) {
  return nodePositions.reduce(function(result, layer, index) {
    // Since we are refering to nodes in the next layer of the network we want to stop
    // at one layer before the output layer
    if (index < (nodePositions.length - 1)) {
      return result.concat(layer.reduce(function(sourceResult, sourceNode) {
        return sourceResult.concat(nodePositions[index+1].reduce(function(targetResult, targetNode, targetIndex) {
          if (index < nodePositions.length-2 && targetIndex === 0) {
            return targetResult;
          }
          targetResult.push({ source: sourceNode, target: targetNode });
          return targetResult;
        }, []));

      }, []));
    } else {
      return result;
    }  
  }, []);
};

// Parse brain object into flat array format for d3 data binding
var flattenBrainWeights = function(brain) {

  var weights = [];

  // Layers are objects with numeric projerty names
  // iterate through source layers
  for (var sourceLayerNum=0; sourceLayerNum<brain.layers.length-1; sourceLayerNum++) {

    var sourceLayer = brain.layers[sourceLayerNum];
    var targetLayer = brain.layers[sourceLayerNum+1];
    // for all source nodes add weights for each target node
    for (var sourceNodeNum=-1; sourceNodeNum<Object.keys(sourceLayer).length; sourceNodeNum++) {

      var sourceNode = sourceLayer[sourceNodeNum];
      for (var targetNodeNum=0; targetNodeNum<Object.keys(targetLayer).length; targetNodeNum++) { 
        var targetNode = targetLayer[targetNodeNum];
        // first add bias node weights
        if (sourceNodeNum === -1) {
          weights.push(targetNode.bias);
        } else {
          weights.push(targetNode.weights[sourceNodeNum]);
        }
      }
    }
  }

  return weights;

};











