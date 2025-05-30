import React, { useState, useEffect } from 'react';
import './App.css';

const WaterPoloMatrix = () => {
  const [hoveredCell, setHoveredCell] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Parse the CSV data
  const csvData = `Rank,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,unranked
1,0.5,0.0,0.7,0.0,,0.0,0.0,,0.0,,,,,,,,,,,0.0,0.1
2,1.0,0.5,0.8,,,,0.0,,,0.0,0.0,,,,,,0.0,,,0.0,0.0
3,0.3,0.2,,0.0,,,0.0,,,0.0,,,,,,,,,,,0.0
4,1.0,,1.0,,0.0,,1.0,,0.0,0.0,,0.0,,,,,,,,0.0,0.1
5,,,,1.0,,,,,0.0,,,0.0,,,,0.5,0.0,,,,0.1
6,1.0,,,,,,0.0,,,,,,,,,,,0.0,0.0,,0.0
7,1.0,1.0,1.0,0.0,,1.0,,,1.0,0.0,1.0,,,,,,,,,1.0,0.6
8,,,,,,,,,,,,,1.0,,,,,,,,0.2
9,1.0,,,1.0,1.0,,0.0,,,,,,0.0,,0.0,,,0.0,,,0.2
10,,1.0,1.0,1.0,,,1.0,,,,,,,,,,,0.0,0.0,,0.1
11,,1.0,,,,,0.0,,,,,,,,,,,,,,0.2
12,,,,1.0,1.0,,,,,,,,,,,,,,,,0.2
13,,,,,,,,0.0,1.0,,,,,,,0.5,,,0.0,,0.0
14,,,,,,,,,,,,,,,,,0.0,,1.0,0.0,0.0
15,,,,,,,,,1.0,,,,,,,,,,,,0.5
16,,,,,0.5,,,,,,,,0.5,,,,0.0,,,,0.0
17,,1.0,,,1.0,,,,,,,,,1.0,,1.0,,,0.0,1.0,0.4
18,,,,,,1.0,,,1.0,1.0,,,,,,,,,,,0.4
19,,,,,,1.0,,,,1.0,,,1.0,0.0,,,1.0,,,,0.4
20,1.0,1.0,,1.0,,,0.0,,,,,,,1.0,,,0.0,,,,0.4
unranked,0.9,1.0,1.0,0.9,0.9,1.0,0.4,0.8,0.8,0.9,0.8,0.8,1.0,1.0,0.5,1.0,0.6,0.6,0.6,0.6,0.5`;

  const parseCSV = (csv) => {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',');
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row = { rank: values[0] };
      for (let j = 1; j < headers.length; j++) {
        const value = values[j];
        row[headers[j]] = value === '' ? null : parseFloat(value);
      }
      data.push(row);
    }
    
    return { headers: headers.slice(1), data };
  };

  const { headers, data } = parseCSV(csvData);

  const getCellColor = (value, isHovered, isHighlighted) => {
    if (value === null) return 'bg-gray-50';
    
    let baseColor = 'bg-blue-500';
    
    if (value === 0) baseColor = 'bg-red-500';
    else if (value <= 0.3) baseColor = 'bg-orange-500';
    else if (value <= 0.7) baseColor = 'bg-yellow-500';
    else baseColor = 'bg-green-500';
    
    if (isHovered) {
      return `${baseColor} ring-2 ring-blue-400 ring-offset-1`;
    }
    
    if (isHighlighted) {
      return `${baseColor} ring-1 ring-blue-300`;
    }
    
    return baseColor;
  };

  const formatRank = (rank) => {
    return rank === 'unranked' ? 'UR' : rank;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Hero Section */}
      <div className="text-center py-16 px-6">
        <h1 className="text-5xl font-thin text-gray-900 mb-4 tracking-tight">
          Men's College Water Polo 2024
        </h1>
        <h2 className="text-2xl font-light text-gray-600 mb-8">
          Win probabilities for differently ranked D1 water polo teams for season 2024
        </h2>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
          Matrix showing win probabilities between differently ranked teams.
          Hover over cells to explore matchup dynamics.
        </p>
      </div>

      {/* Legend */}
      <div className="max-w-6xl mx-auto px-6 mb-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Probability Scale</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm text-gray-600">0% (Certain Loss)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <span className="text-sm text-gray-600">Low (0-30%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-sm text-gray-600">Medium (30-70%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm text-gray-600">High (70-100%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Matrix */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-medium text-gray-900">Probability Matrix</h3>
                <p className="text-gray-500 mt-1">Row team vs Column team win probability</p>
              </div>
              {hoveredCell && (
                <div className="bg-gray-50 rounded-xl px-4 py-2">
                  <span className="text-sm font-medium text-gray-900">
                    Rank {formatRank(hoveredCell.row)} vs Rank {formatRank(hoveredCell.col)}: {' '}
                    <span className="text-blue-600">
                      {hoveredCell.value !== null ? `${(hoveredCell.value * 100).toFixed(0)}%` : 'N/A'}
                    </span>
                  </span>
                </div>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="w-12 h-12"></th>
                    {headers.map((header) => (
                      <th
                        key={header}
                        className="w-12 h-12 text-xs font-medium text-gray-600 text-center"
                      >
                        {formatRank(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, rowIndex) => (
                    <tr key={row.rank}>
                      <td className="w-12 h-12 text-xs font-medium text-gray-600 text-center border-r border-gray-100">
                        {formatRank(row.rank)}
                      </td>
                      {headers.map((header, colIndex) => {
                        const value = row[header];
                        const isHovered = hoveredCell?.row === row.rank && hoveredCell?.col === header;
                        const isHighlighted = selectedTeam === row.rank || selectedTeam === header;
                        
                        return (
                          <td
                            key={`${row.rank}-${header}`}
                            className="w-12 h-12 p-0.5"
                            onMouseEnter={() => setHoveredCell({ row: row.rank, col: header, value })}
                            onMouseLeave={() => setHoveredCell(null)}
                            onClick={() => setSelectedTeam(selectedTeam === row.rank ? null : row.rank)}
                          >
                            <div
                              className={`w-full h-full rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center ${getCellColor(value, isHovered, isHighlighted)}`}
                            >
                              {value !== null && (
                                <span className="text-xs font-medium text-white drop-shadow-sm">
                                  {value === 0 ? '0' : value === 1 ? '1' : value.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-12 px-6">
        <p className="text-sm text-gray-400">
          Data represents win probabilities in men's water polo matchups
        </p>
      </div>
    </div>
  );
};

function App() {
  return <WaterPoloMatrix />;
}

export default App;