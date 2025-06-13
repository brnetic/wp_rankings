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
      console.log('Fetching matches for:', rowRank, 'vs', colRank); // Debug log
      
      setMatchesModal(prev => ({ 
        ...prev, 
        loading: true, 
        open: true,
        rowRank: rowRank,
        colRank: colRank,
        error: null 
      }));
      
      // Convert unranked to 21 for API call
      let apiRowRank = rowRank;
      let apiColRank = colRank;
      
      if(colRank === "unranked"){
        apiColRank = 21;
      }
      if(rowRank === 'unranked'){
        apiRowRank = 21;
      }
      
      console.log('API call with ranks:', apiRowRank, 'vs', apiColRank); // Debug log
      
      const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://wpserver.onrender.com';
      const response = await fetch(`${BASE_URL}/api/matches/${apiRowRank}/${apiColRank}`);
      
      console.log('Response status:', response.status); // Debug log
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const json = await response.json();
      console.log('Received matches:', json); // Debug log
      
      setMatchesModal({
        open: true,
        matches: json.matches || [],
        loading: false,
        rowRank: rowRank, // Keep original rank names for display
        colRank: colRank,
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
      <div className="text-center py-8 md:py-16 px-6">
        <h1 className="text-3xl md:text-5xl font-thin text-gray-900 mb-4 tracking-tight">
          Men's College Water Polo 2019-2024
        </h1>
        <h2 className="text-lg md:text-2xl font-light text-gray-600 mb-8">
          Win probabilities for differently ranked D1 water polo teams for seasons 2019 to 2024.
        </h2>
        <p className="text-sm md:text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
          Matrix showing win probabilities between differently ranked teams,
          based on 2052 games played. Click on any cell to view specific matches.
        </p>
      </div>

      {/* Display Mode Toggle */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 mb-6 md:mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
          <h3 className="text-base md:text-lg font-medium text-gray-900 mb-4">Display Format</h3>
          <div className="flex flex-wrap gap-2 md:gap-3">
            <button
              onClick={() => setDisplayMode('decimal')}
              className={`px-3 md:px-4 py-2 rounded-lg font-medium tra</svg>nsition-all text-sm md:text-base ${
                displayMode === 'decimal'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Decimal
            </button>
            <button
              onClick={() => setDisplayMode('percentage')}
              className={`px-3 md:px-4 py-2 rounded-lg font-medium transition-all text-sm md:text-base ${
                displayMode === 'percentage'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Percentage
            </button>
            <button
              onClick={() => setDisplayMode('fraction')}
              className={`px-3 md:px-4 py-2 rounded-lg font-medium transition-all text-sm md:text-base ${
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
      <div className="max-w-6xl mx-auto px-4 md:px-6 mb-8 md:mb-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
          <h3 className="text-base md:text-lg font-medium text-gray-900 mb-4">Probability Scale</h3>
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="grid grid-cols-2 md:flex md:items-center gap-3 md:space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 md:w-4 md:h-4 bg-red-500 rounded"></div>
                <span className="text-xs md:text-sm text-gray-600">0% (Certain Loss)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 md:w-4 md:h-4 bg-orange-500 rounded"></div>
                <span className="text-xs md:text-sm text-gray-600">Low (0–30%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 md:w-4 md:h-4 bg-yellow-500 rounded"></div>
                <span className="text-xs md:text-sm text-gray-600">Medium (30–70%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 md:w-4 md:h-4 bg-green-500 rounded"></div>
                <span className="text-xs md:text-sm text-gray-600">High (70–100%)</span>
              </div>
            </div>
            <div className="mt-2 md:mt-0">
              <span className="text-xs md:text-sm text-gray-700">
                Opacity represents number of the games played
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Probability Matrix */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-8 md:pb-16">
        <div className="bg-white rounded-2xl md:rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-4 md:p-8">
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 mb-6 md:mb-8">
              <div>
                <h3 className="text-lg md:text-xl font-medium text-gray-900">Probability Matrix</h3>
                <p className="text-gray-500 mt-1 text-sm md:text-base">Row team vs Column team win probability</p>
              </div>
              <div className="flex flex-col items-end space-y-2">
                {hoveredCell && (
                  <div className="bg-gray-50 rounded-xl px-3 md:px-4 py-2">
                    <span className="text-xs md:text-sm font-medium text-gray-900">
                      Rank {formatRank(hoveredCell.row)} vs Rank {formatRank(hoveredCell.col)}:{' '}
                      <span className="text-blue-600">
                        {formatHoverValue(hoveredCell.value, hoveredCell.delim)}
                      </span>
                    </span>
                  </div>
                )}
                <a
                  href="https://coff.ee/brnetic"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 bg-[#FFDD00] hover:bg-[#FFE333] text-[#000000] px-3 py-1.5 rounded-lg transition-colors shadow-sm text-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.216 6.415l-.132-.666c-.119-.598-.388-1.163-1.001-1.379-.197-.069-.42-.098-.57-.241-.152-.143-.196-.366-.231-.572-.065-.378-.125-.756-.192-1.133-.057-.325-.102-.69-.25-.987-.195-.4-.597-.634-.996-.788a5.723 5.723 0 00-.626-.194c-1-.263-2.05-.36-3.077-.416a25.834 25.834 0 00-3.7.062c-.915.083-1.88.184-2.75.5-.318.116-.646.256-.888.501-.297.302-.393.77-.177 1.146.154.267.415.456.692.58.36.162.737.284 1.123.366 1.075.238 2.189.331 3.287.37 1.218.05 2.437.01 3.65-.118.299-.033.598-.073.896-.119.352-.054.578-.513.474-.834-.124-.383-.457-.531-.834-.473-.466.074-.96.108-1.382.146-1.177.08-2.358.082-3.536.006a22.228 22.228 0 01-1.157-.107c-.086-.01-.18-.025-.258-.036-.243-.036-.484-.08-.724-.13-.111-.027-.111-.185 0-.212h.005c.277-.06.557-.108.838-.147h.002c.131-.009.263-.032.394-.048a25.076 25.076 0 013.426-.12c.674.019 1.347.067 2.017.144l.228.031c.267.04.533.088.798.145.392.085.895.113 1.07.542.055.137.08.288.111.431l.319 1.484a.237.237 0 01-.199.284h-.003c-.037.006-.075.01-.112.015a36.704 36.704 0 01-4.743.295 37.059 37.059 0 01-4.699-.304c-.14-.017-.293-.042-.417-.06-.326-.048-.649-.108-.973-.161-.393-.065-.768-.032-1.123.161-.29.16-.527.404-.675.701-.154.316-.199.66-.267 1-.069.34-.176.707-.135 1.056.087.753.613 1.365 1.37 1.502a39.69 39.69 0 0011.343.376.483.483 0 01.535.53l-.071.697-1.018 9.907c-.041.41-.047.832-.125 1.237-.122.637-.553 1.028-1.182 1.171-.577.131-1.165.2-1.756.205-.656.004-1.31-.025-1.966-.022-.699.004-1.556-.06-2.095-.58-.475-.458-.54-1.174-.605-1.793l-.731-7.013-.322-3.094c-.037-.351-.286-.695-.678-.678-.336.015-.718.3-.678.679l.228 2.185.949 9.112c.147 1.344 1.174 2.068 2.446 2.272.742.12 1.503.144 2.257.156.966.016 1.942.053 2.892-.122 1.408-.258 2.465-1.198 2.616-2.657.34-3.332.683-6.663 1.024-9.995l.215-2.087a.484.484 0 01.39-.426c.402-.078.787-.212 1.074-.518.455-.488.546-1.124.385-1.766zm-1.478.772c-.145.137-.363.201-.578.233-2.416.359-4.866.54-7.308.46-1.748-.06-3.477-.254-5.207-.498-.17-.024-.353-.055-.47-.18-.22-.236-.111-.71-.054-.995.052-.26.152-.609.463-.646.484-.057 1.046.148 1.526.22.577.088 1.156.159 1.737.212 2.48.226 5.002.19 7.472-.14.45-.06.899-.13 1.345-.21.399-.072.84-.206 1.08.206.166.281.188.657.162.974a.544.544 0 01-.169.364zm-6.159 3.9c-.862.37-1.84.788-3.109.788a5.884 5.884 0 01-1.569-.217l.877 9.004c.065.78.717 1.38 1.5 1.38 0 0 1.243.065 1.658.065.447 0 1.786-.065 1.786-.065.783 0 1.434-.6 1.499-1.38l.94-9.95a3.996 3.996 0 00-1.322-.238c-.826 0-1.491.284-2.26.613z"/>
                  </svg>
                  <span className="font-medium">Support the Project</span>
                </a>
              </div>
            </div>

            {/* Matrix container with sticky headers */}
            <div className="relative border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-auto max-h-[70vh]" style={{ maxWidth: '100%' }}>
                <table className="relative">
                  <thead className="bg-white sticky top-0 z-20 border-b border-gray-200">
                    <tr>
                      <th className="sticky left-0 z-30 bg-white border-r border-gray-200 w-12 h-12 min-w-12"></th>
                      {headers.map((header) => (
                        <th
                          key={header}
                          className="w-12 h-12 min-w-12 text-xs font-medium text-gray-600 text-center bg-white"
                        >
                          {formatRank(header)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {probData.map((row, rowIndex) => (
                      <tr key={row.rank}>
                        <td className="sticky left-0 z-10 bg-white border-r border-gray-200 w-12 h-12 min-w-12 text-xs font-medium text-gray-600 text-center">
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
                              className="w-12 h-12 min-w-12 p-0.5"
                              onMouseEnter={() =>
                                setHoveredCell({
                                  row: row.rank,
                                  col: header,
                                  value: probValue,
                                  delim: delimValue,
                                })
                              }
                              onMouseLeave={() => setHoveredCell(null)}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Cell clicked:', row.rank, 'vs', header, 'probValue:', probValue, 'delimValue:', delimValue);
                                if (probValue !== null && delimValue !== null && delimValue > 0) {
                                  fetchMatches(row.rank, header);
                                } else {
                                  console.log('No data available for this cell');
                                  // Show a brief message for cells with no data
                                  setMatchesModal({
                                    open: true,
                                    matches: [],
                                    loading: false,
                                    rowRank: row.rank,
                                    colRank: header,
                                    error: 'No match data available for this ranking combination'
                                  });
                                }
                              }}
                              onTouchStart={(e) => {
                                // Record touch start position and time
                                const touch = e.touches[0];
                                e.currentTarget.touchStartX = touch.clientX;
                                e.currentTarget.touchStartY = touch.clientY;
                                e.currentTarget.touchStartTime = Date.now();
                              }}
                              onTouchEnd={(e) => {
                                // Only trigger if it was a tap, not a scroll
                                const touch = e.changedTouches[0];
                                const touchEndX = touch.clientX;
                                const touchEndY = touch.clientY;
                                const touchEndTime = Date.now();
                                
                                const startX = e.currentTarget.touchStartX || touchEndX;
                                const startY = e.currentTarget.touchStartY || touchEndY;
                                const startTime = e.currentTarget.touchStartTime || touchEndTime;
                                
                                const deltaX = Math.abs(touchEndX - startX);
                                const deltaY = Math.abs(touchEndY - startY);
                                const deltaTime = touchEndTime - startTime;
                                
                                // Only trigger if movement is small (< 10px) and time is short (< 500ms)
                                if (deltaX < 10 && deltaY < 10 && deltaTime < 500) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('Cell tapped:', row.rank, 'vs', header);
                                  if (probValue !== null && delimValue !== null && delimValue > 0) {
                                    fetchMatches(row.rank, header);
                                  } else {
                                    setMatchesModal({
                                      open: true,
                                      matches: [],
                                      loading: false,
                                      rowRank: row.rank,
                                      colRank: header,
                                      error: 'No match data available for this ranking combination'
                                    });
                                  }
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
      </div>

      {/* Footer */}
      <div className="text-center py-8 md:py-12 px-6">
        <p className="text-xs md:text-sm text-gray-400">
          Opacity ∝ (number of games / 8). Higher delim → more opaque.
        </p>
        <p className="text-xs md:text-sm text-gray-400 mt-2">
          Data loaded from MongoDB • {probData.length} teams • {headers.length} ranks
        </p>
      </div>

      {/* Matches Modal */}
      {matchesModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 md:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-gray-900">
                    Matches: Rank {formatRank(matchesModal.rowRank)} vs Rank {formatRank(matchesModal.colRank)}
                  </h3>
                  <p className="text-gray-500 mt-1 text-sm md:text-base">
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
            
            <div className="p-4 md:p-6 overflow-y-auto max-h-96">
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
                    <div key={index} className="bg-gray-50 rounded-lg p-3 md:p-4 border border-gray-200">
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-xs md:text-sm font-medium text-gray-900">
                            {match.date}
                          </div>
                          <div className="text-xs md:text-sm text-gray-500">
                            #{match.homeTeamRanking} vs #{match.awayTeamRanking}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="text-sm md:text-lg font-semibold">
                            <span className="text-gray-900">{match.homeTeam}</span>
                            <span className="mx-1 md:mx-2 text-blue-600">{match.homeGoals}</span>
                            <span className="text-gray-400">-</span>
                            <span className="mx-1 md:mx-2 text-blue-600">{match.awayGoals}</span>
                            <span className="text-gray-900">{match.awayTeam}</span>
                          </div>
                          
                          {match.newsUrl && (
                            <a
                              href={match.newsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 transition-colors px-3 py-1 rounded-md hover:bg-blue-50"
                            >
                              <span>News</span>
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                className="h-4 w-4" 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                              >
                                <path 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round" 
                                  strokeWidth={2} 
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
                                />
                              </svg>
                            </a>
                          )}
                        </div>
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