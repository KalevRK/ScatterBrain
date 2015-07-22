/*
* @Author: Katrina Uychaco
* @Date:   2015-07-20 14:50:47
* @Last Modified by:   Katrina Uychaco
* @Last Modified time: 2015-07-21 18:00:59
*/

'use strict';

var brain = require('brain');

// Worker code for training neural net

// Process data when passed in
process.on('message', function(data) {

  var net = new brain.NeuralNetwork({
    hiddenLayers: data.hiddenLayers,
    learningRate: data.learningRate
  });

  var trainingData = [
    {input: [0, 0], output: [0]},
    {input: [0, 1], output: [1]},
    {input: [1, 0], output: [1]},
    {input: [1, 1], output: [0]}
  ];

  var options = {
    callback: function(result) {
      // console.log('###### Process PID', process.pid, '#######\n ', result.iterations, '\n', result.error, '\n', result.brain);
      process.send(result);
    },
    callbackPeriod: 500,
    iterations: data.iterations
  };

  net.train(trainingData, options);

  var output = net.run([1, 0]);  // [0.987]

  console.log('OUTPUT for PID', process.pid, '\n', output);

});
