export const getCircuitStations = (layout, exercises = []) => {
  if (!layout) return [];

  const exercisesById = new Map(exercises.map((exercise) => [String(exercise.id), exercise]));
  const placedIds = layout.items?.map((item) => String(item.exerciseId)) || [];
  const orderedIds = [
    ...(layout.exerciseOrder || []).filter((exerciseId) => placedIds.includes(String(exerciseId))).map(String),
    ...placedIds.filter((exerciseId) => !(layout.exerciseOrder || []).map(String).includes(String(exerciseId))),
  ];

  return orderedIds
    .map((exerciseId) => exercisesById.get(String(exerciseId)))
    .filter(Boolean);
};

export const buildCircuitDetailsMap = ({ layouts = [], exercises = [] }) =>
  layouts.reduce((detailsMap, layout) => ({
    ...detailsMap,
    [layout.id]: {
      layout,
      stations: getCircuitStations(layout, exercises),
    },
  }), {});
