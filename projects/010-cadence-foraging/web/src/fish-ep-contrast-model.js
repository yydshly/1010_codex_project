// Fixed sample readback: these calculations do not run or train a network.
export function buildContrastStory(record) {
  const t = 6, port = 2, neuron = 0;
  const beta = record.update.beta, count = record.input.features.length * record.config.outputs;
  const weight = record.parameters.before.C[port][neuron];
  const origin = record.training_positions[record.input.cutoff_steps[t]];
  const truth = record.training_positions[record.input.cutoff_steps[t] + record.config.horizons[1]];
  const scale = record.config.displacement_scale;
  const phases = Object.fromEntries(['free', 'plus', 'minus'].map(name => {
    const phase = record.phases[name];
    const teachingBeta = name === 'free' ? 0 : (name === 'plus' ? beta : -beta);
    const rows = phase.activity.map((activity, k) => {
      const q = record.parameters.before.C[port].reduce((sum, w, j) => sum + w * activity[j], 0);
      const error = q - record.targets[k][port], a = activity[neuron];
      return {q, a, error, outputError: phase.output[k][port] - record.targets[k][port], product: error * a, errorActivityOverN: error * a / count};
    });
    const terms = phase.output_defect.map((row, k) => -row[port] * phase.activity[k][neuron]);
    return [name, {
      rows, teachingBeta, factor: count / (count + teachingBeta),
      h: phase.hidden[t][neuron], a: phase.activity[t][neuron],
      q: rows[t].q,
      y: phase.output[t][port], r: phase.output_defect[t][port], terms,
      g: terms.reduce((sum, v) => sum + v, 0), x: origin[0] + phase.output[t][port] * scale
    }];
  }));
  const positiveEstimate = phases.plus.g / beta;
  const negativeEstimate = phases.minus.g / -beta;
  const exact = record.phases.free.output.reduce((sum, row, k) =>
    sum + (row[port] - record.targets[k][port]) * record.phases.free.activity[k][neuron], 0) / count;
  const probes = record.parameter_probe.trials.map(trial => ({...trial,
    x: origin[0] + trial.output[t][port] * scale,
    error: Math.hypot(...origin.map((v, k) => v + trial.output[t][port + k] * scale - truth[k]))
  }));
  return {
    t, port, neuron, beta, count, weight, origin, truth, phases, probes,
    z: record.targets[t][port], positiveEstimate, negativeEstimate, exact,
    focusSlope: phases.free.rows[t].errorActivityOverN,
    slope: (positiveEstimate + negativeEstimate) / 2,
    savedSlope: record.parameters.ep_delta.C[port][neuron],
    rate: record.update.accepted_rate, newWeight: record.parameters.after.C[port][neuron],
    change: record.parameters.actual_change.C[port][neuron],
    initialLoss: record.update.initial_loss, finalLoss: record.update.final_loss,
    allX: origin[0] + record.phases.after.output[t][port] * scale,
    allError: Math.hypot(...origin.map((v, k) => v + record.phases.after.output[t][port + k] * scale - truth[k]))
  };
}
