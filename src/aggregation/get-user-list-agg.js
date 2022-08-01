export default function getUserListAgg(filter, page, rowsPerPage) {
  const agg = [];
  if (filter !== "all") {
    agg.push({
      $match: {
        role: {
          $eq: filter,
        },
      },
    });
  }

  if (page > 1) {
    agg.push({
      $skip: page * rowsPerPage,
    });
  }

  if (rowsPerPage > 0) {
    agg.push({
      $limit: rowsPerPage,
    });
  }
  agg.push({
    $project: {
      name: {
        $concat: ["$firstName", " ", "$lastName"],
      },
      email: 1,
      type: "$role",
      active: 1,
    },
  });
  return agg;
}
