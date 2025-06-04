import React, { useState, useEffect } from 'react';

const WaterPoloMatrix = () => {
  const [hoveredCell, setHoveredCell] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [displayMode, setDisplayMode] = useState('decimal'); // 'decimal', 'percentage', 'fraction'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matchesModal, setMatchesModal] = useState({ open: false, matches: [], loading: false, rowRank: null, colRank: null });

  // State to hold fetched data
  const [headers, setHeaders] = useState([]);  // ["1","2",…,"20","unranked"]
  const [probData, setProbData] = useState([]);  // Array of { rank: "1", "1":0.5, … }
  const [delimData, setDelimData] = useState([]);  // Array of { rank: "1", "1":4, … }

  // Fetch from your Flask API on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Updated to use your correct port
        const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://wpserver.onrender.com';
        const response = await fetch(`${BASE_URL}/api/matrix`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const json = await response.json();
        
        console.log('Received data:', json); // Debug log
        
        setHeaders(json.headers || []);
        setProbData(json.probData || []);
        setDelimData(json.delimData || []);
        
      } catch (err) {
        console.error('Error fetching matrix:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch matches for specific cell
  const fetchMatches = async (rowRank, colRank) => {
    try {
      setMatchesModal(prev => ({ ...prev, loading: true }));
      if(colRank == "unranked"){
        colRank = 21;
      }
      if(rowRank=='unranked'){
        rowRank = 21;
      }
      const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://wpserver.onrender.com';
      const response = await fetch(`${BASE_URL}/api/matches/${rowRank}/${colRank}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const json = await response.json();
      
      setMatchesModal({
        open: true,
        matches: json.matches || [],
        loading: false,
        rowRank,
        colRank,
        error: null
      });
      
    } catch (err) {
      console.error('Error fetching matches:', err);
      setMatchesModal(prev => ({
        ...prev,
        loading: false,
        error: err.message
      }));
    }
  };



  // Convert a decimal to a fraction string if needed
  const decimalToFraction = (decimal) => {
    if (decimal === null) return null;
    if (decimal === 0) return '0/1';
    if (decimal === 1) return '1';

    const common = {
      0.1: '1/10',
      0.2: '1/5',
      0.3: '3/10',
      0.4: '2/5',
      0.5: '1/2',
      0.6: '3/5',
      0.7: '7/10',
      0.8: '4/5',
      0.9: '9/10',
    };
    if (common[decimal]) return common[decimal];

    const tol = 1e-6;
    let denom = 1;
    while (
      Math.abs(decimal * denom - Math.round(decimal * denom)) > tol &&
      denom < 1000
    ) {
      denom++;
    }
    const numer = Math.round(decimal * denom);
    const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
    const div = gcd(numer, denom);
    return `${numer / div}/${denom}`;
  };

  // Show full tooltip: "50% (2/4, 0.5)"
  const formatHoverValue = (value, delim) => {
    if (value === null || delim === null || delim === 0) return 'N/A';
    const rawNumerator = Math.round(value * delim);
    const fraction = `${rawNumerator}/${delim}`;
    const percent = `${Math.round((rawNumerator / delim) * 100)}%`;
    const decimal = value === 0 ? '0.0' : value === 1 ? '1.0' : value.toFixed(1);
    return `${percent} (${fraction}, ${decimal})`;
  };

  // Format the cell's text depending on displayMode
  const formatCellValue = (value, delim) => {
    if (value === null || delim === null || delim === 0) return '';
    const rawNumerator = Math.round(value * delim);
    const denom = delim;

    switch (displayMode) {
      case 'percentage':
        return `${Math.round((rawNumerator / denom) * 100)}%`;
      case 'fraction':
        return `${rawNumerator}/${denom}`;
      case 'decimal':
      default:
        if (value === 0) return '0';
        if (value === 1) return '1';
        return value.toFixed(1);
    }
  };

  // Compute an RGBA backgroundColor string based on probability and delim
  const getCellStyle = (value, delim) => {
    if (value === null || delim === null || delim === 0) {
      // Very light gray for missing data
      return { backgroundColor: 'rgba(249, 250, 251, 1)' };
    }

    // Determine base RGB from probability
    let baseRGB = [59, 130, 246]; // default Blue‑500: rgb(59,130,246)
    if (value === 0) {
      baseRGB = [239, 68, 68]; // Red‑500
    } else if (value <= 0.3) {
      baseRGB = [249, 115, 22]; // Orange‑500
    } else if (value <= 0.7) {
      baseRGB = [234, 179, 8]; // Yellow‑500
    } else {
      baseRGB = [34, 197, 94]; // Green‑500
    }

    const alpha = 0.5 + Math.min(delim / 8, 0.5); // clamp at 1
    return {
      backgroundColor: `rgba(${baseRGB[0]}, ${baseRGB[1]}, ${baseRGB[2]}, ${alpha.toFixed(2)})`,
    };
  };

  const formatRank = (rank) => (rank === 'unranked' ? 'UR' : rank);

  const closeMatchesModal = () => {
    setMatchesModal({ open: false, matches: [], loading: false, rowRank: null, colRank: null, error: null });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading water polo matrix...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h3 className="text-red-800 font-medium mb-2">Failed to load data</h3>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="text-center py-16 px-6">
        <h1 className="text-5xl font-thin text-gray-900 mb-4 tracking-tight">
          Men's College Water Polo 2024
        </h1>
        <h2 className="text-2xl font-light text-gray-600 mb-8">
          Win probabilities for differently ranked D1 water polo teams for season 2024.
        </h2>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
          Matrix showing win probabilities between differently ranked teams,
          based on game data from MongoDB. Click on any cell to view specific matches.
        </p>
      </div>

      {/* Display Mode Toggle */}
      <div className="max-w-6xl mx-auto px-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Display Format</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setDisplayMode('decimal')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                displayMode === 'decimal'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Decimal
            </button>
            <button
              onClick={() => setDisplayMode('percentage')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                displayMode === 'percentage'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Percentage
            </button>
            <button
              onClick={() => setDisplayMode('fraction')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                displayMode === 'fraction'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Fraction
            </button>
          </div>
        </div>
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
                <span className="text-sm text-gray-600">Low (0–30%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-sm text-gray-600">Medium (30–70%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm text-gray-600">High (70–100%)</span>
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-700">
                Opacity represents number of the games played
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Probability Matrix */}
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
                    Rank {formatRank(hoveredCell.row)} vs Rank {formatRank(hoveredCell.col)}:{' '}
                    <span className="text-blue-600">
                      {formatHoverValue(hoveredCell.value, hoveredCell.delim)}
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
                  {probData.map((row, rowIndex) => (
                    <tr key={row.rank}>
                      <td className="w-12 h-12 text-xs font-medium text-gray-600 text-center border-r border-gray-100">
                        {formatRank(row.rank)}
                      </td>
                      {headers.map((header) => {
                        const probValue = row[header];
                        const delimValue = delimData[rowIndex]?.[header];
                        const isHovered =
                          hoveredCell?.row === row.rank && hoveredCell?.col === header;
                        const isHighlighted =
                          selectedTeam === row.rank || selectedTeam === header;

                        return (
                          <td
                            key={`${row.rank}-${header}`}
                            className="w-12 h-12 p-0.5"
                            onMouseEnter={() =>
                              setHoveredCell({
                                row: row.rank,
                                col: header,
                                value: probValue,
                                delim: delimValue,
                              })
                            }
                            onMouseLeave={() => setHoveredCell(null)}
                            onClick={() => {
                              if (probValue !== null && delimValue !== null && delimValue > 0) {
                                fetchMatches(row.rank, header);
                              }
                            }}
                          >
                            <div
                              className={`w-full h-full rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center ${
                                isHovered
                                  ? 'ring-2 ring-blue-400 ring-offset-1'
                                  : isHighlighted
                                  ? 'ring-1 ring-blue-300'
                                  : ''
                              } ${probValue !== null && delimValue !== null && delimValue > 0 ? 'hover:scale-105' : ''}`}
                              style={getCellStyle(probValue, delimValue)}
                            >
                              {probValue !== null && delimValue !== null && (
                                <span
                                  className={`text-xs font-medium text-white drop-shadow-sm ${
                                    displayMode === 'fraction'
                                      ? 'text-[10px] leading-tight'
                                      : ''
                                  }`}
                                >
                                  {formatCellValue(probValue, delimValue)}
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
          Opacity ∝ (number of games / 8). Higher delim → more opaque.
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Data loaded from MongoDB • {probData.length} teams • {headers.length} ranks
        </p>
      </div>

      {/* Matches Modal */}
      {matchesModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Matches: Rank {formatRank(matchesModal.rowRank)} vs Rank {formatRank(matchesModal.colRank)}
                  </h3>
                  <p className="text-gray-500 mt-1">
                    {matchesModal.matches.length} match{matchesModal.matches.length !== 1 ? 'es' : ''} found
                  </p>
                </div>
                <button
                  onClick={closeMatchesModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-light"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-96">
              {matchesModal.loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading matches...</p>
                </div>
              ) : matchesModal.error ? (
                <div className="text-center py-8">
                  <p className="text-red-600">Error loading matches: {matchesModal.error}</p>
                </div>
              ) : matchesModal.matches.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No matches found between these ranks.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {matchesModal.matches.map((match, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-gray-900">
                          {match.date}
                        </div>
                        <div className="text-sm text-gray-500">
                          #{match.homeTeamRanking} vs #{match.awayTeamRanking}
                        </div>
                      </div>
                      <div className="text-lg font-semibold">
                        <span className="text-gray-900">{match.homeTeam}</span>
                        <span className="mx-2 text-blue-600">{match.homeGoals}</span>
                        <span className="text-gray-400">-</span>
                        <span className="mx-2 text-blue-600">{match.awayGoals}</span>
                        <span className="text-gray-900">{match.awayTeam}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaterPoloMatrix;