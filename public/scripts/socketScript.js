const socket = io();

socket.on("updateResults", (results) => {
  const resultsContainer = document.getElementById("results");
  resultsContainer.innerHTML = "";

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.position]) {
      acc[result.position] = [];
    }
    acc[result.position].push(result);
    return acc;
  }, {});

  Object.keys(groupedResults).forEach((position) => {
    const section = document.createElement("section");
    section.innerHTML = `<h2>${position}</h2>`;

    const totalVotesForPosition = groupedResults[position].reduce(
      (acc, result) => acc + result.number_of_votes,
      0
    );

    const table = document.createElement("table");
    table.innerHTML = `
            <thead>
              <tr>
                <th>Candidate Name</th>
                <th>Number of Votes</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${groupedResults[position]
                .map(
                  (result) => `
                <tr>
                  <td>${result.candidate_name}</td>
                  <td>${result.number_of_votes}</td>
                  <td>${(
                    (result.number_of_votes / totalVotesForPosition) *
                    100
                  ).toFixed(2)}%</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          `;
    section.appendChild(table);
    resultsContainer.appendChild(section);
  });
});
