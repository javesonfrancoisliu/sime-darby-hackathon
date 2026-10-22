// Point totals and costs read with digit grouping, and "1 point" in the singular.
export const formatPoints = (n: number) => n.toLocaleString("en-MY");

export const pointsLabel = (n: number, one = "point", many = "points") =>
  `${formatPoints(n)} ${n === 1 ? one : many}`;
