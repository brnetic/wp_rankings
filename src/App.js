import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const WaterPoloMatrix = () => {
  const [hoveredCell, setHoveredCell] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [displayMode, setDisplayMode] = useState('decimal'); // 'decimal', 'percentage', 'fraction'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matchesModal, setMatchesModal] = useState({ open: false, matches: [], loading: false, rowRank: null, colRank: null });
  const [gender, setGender] = useState('MWP'); // 'MWP' for Men's, 'WWP' for Women's
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' or 'rankings'

  // Ranking history states
  const [showRankingHistory, setShowRankingHistory] = useState(true);
  const [rankingData, setRankingData] = useState([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState([
    'University of California-Los Angeles',
    'University of Southern California'
  ]);
  const [dateRange, setDateRange] = useState({
    start: new Date('2024-01-01'),
    end: new Date('2024-12-31')
  });

  // Update date range when gender changes
  useEffect(() => {
    if (gender === 'WWP') {
      setDateRange({
        start: new Date('2025-01-01'),
        end: new Date('2025-06-01')
      });
    } else {
      setDateRange({
        start: new Date('2024-01-01'),
        end: new Date('2024-12-31')
      });
    }
    
    // Reset selected teams to default when switching gender
    setSelectedTeams([
      'University of California-Los Angeles',
      'University of Southern California'
    ]);
    
    // Clear ranking data since we're switching divisions
    setRankingData([]);
  }, [gender]);

  // State to hold fetched data
  const [headers, setHeaders] = useState([]);  // ["1","2",…,"20","unranked"]
  const [probData, setProbData] = useState([]);  // Array of { rank: "1", "1":0.5, … }
  const [delimData, setDelimData] = useState([]);  // Array of { rank: "1", "1":4, … }

  // Fetch from your Flask API on mount
  const fetchWithCache = async (url) => {
    // Try to get data from localStorage first
    const cachedData = localStorage.getItem(url);
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      // Check if cache is less than 1 hour old
      if (Date.now() - timestamp < 3600000) {
        return data;
      }
    }

    // If no cache or expired, fetch new data
    const response = await fetch(url, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // Store in localStorage with timestamp
    localStorage.setItem(url, JSON.stringify({
      data,
      timestamp: Date.now()
    }));

    return data;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://wpserver.onrender.com';
        const json = await fetchWithCache(`${BASE_URL}/api/${gender}/matrix`);
        
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
  }, [gender]); // Re-fetch when gender changes

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
      
      // Convert unranked to appropriate number for API call
      let apiRowRank = rowRank;
      let apiColRank = colRank;
      
      if(colRank === "unranked"){
        apiColRank = gender === 'WWP' ? 26 : 21;
      }
      if(rowRank === 'unranked'){
        apiRowRank = gender === 'WWP' ? 26 : 21;
      }
      
      console.log('API call with ranks:', apiRowRank, 'vs', apiColRank); // Debug log
      
      const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://wpserver.onrender.com';
      const json = await fetchWithCache(`${BASE_URL}/api/${gender}/matches/${apiRowRank}/${apiColRank}`);
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

  // Fetch ranking history data
  const fetchRankingHistory = async () => {
    try {
      setRankingLoading(true);
      const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://wpserver.onrender.com';
      const teamNamesStr = selectedTeams.join(',');
      const url = `${BASE_URL}/${gender}/rankings/${encodeURIComponent(teamNamesStr)}/${dateRange.start}/${dateRange.end}`;
      
      console.log('Fetching ranking history from:', url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      console.log('Received ranking data:', data);
      setRankingData(data.data || []);
    } catch (err) {
      console.error('Error fetching ranking history:', err);
      setRankingData([]);
    } finally {
      setRankingLoading(false);
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
    const decimal = value === 0 ? '0.00' : value === 1 ? '1.00' : value.toFixed(2);
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
        return value.toFixed(2);
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

  // Prepare chart data for ranking history
  const prepareChartData = () => {
    if (!rankingData.length) return { labels: [], datasets: [] };

    // Get unique dates and sort them
    const dates = [...new Set(rankingData.map(item => item.date))].sort();
    
    // Team name mapping for API calls - mapping from full names to API expected names
    const teamNameMapping = {
      "University of California, San Diego": "University of California-San Diego",
      "University of California, Davis": "University of California-Davis", 
      "University of California, Santa Barbara": "University of California-Santa Barbara",
      "University of California, Irvine": "University of California-Irvine"
    };
    
    // Team colors
    const teamColors = {
      'University of Southern California': '#DC2626', // Red-600
      'University of California': '#1E40AF', // Blue-800 (Navy)
      'University of California-Los Angeles': '#0284C7', // Sky-600
      'Stanford University': '#B91C1C', // Red-700
      'Pepperdine University': '#EA580C', // Orange-600
      'University of the Pacific': '#059669', // Emerald-600
      'University of California-Irvine': '#7C3AED', // Violet-600
      'University of California-Santa Barbara': '#DB2777', // Pink-600
      'Long Beach State University': '#0D9488', // Teal-600
      'University of California-Davis': '#65A30D', // Lime-600
      'University of California-San Diego': '#2563EB', // Blue-600
      'Princeton University': '#F59E0B', // Amber-500
      'Fordham University': '#6366F1', // Indigo-500
      'California Baptist University': '#8B5CF6', // Purple-500
      'Harvard University': '#EF4444', // Red-500
      'Brown University': '#92400E', // Amber-800
      'Santa Clara University': '#BE123C', // Rose-700
      'Loyola Marymount University': '#1D4ED8', // Blue-700
      'United States Naval Academy': '#1E3A8A', // Blue-900
      'San Jose State University': '#166534', // Green-800
      'University of Hawaii': '#0891B2', // Cyan-600
      'Fresno State': '#DC2626', // Red-600
      'Arizona State University': '#92400E', // Amber-800
      'Indiana University': '#B91C1C', // Red-700
      'Wagner College': '#059669', // Emerald-600
      'University of Michigan': '#1E40AF', // Blue-800
      'Marist College': '#DC2626', // Red-600
      'San Diego State University': '#B91C1C', // Red-700
      'McKendree University': '#7C3AED', // Violet-600
      'Pomona-Pitzer Colleges': '#0D9488' // Teal-600
    };

    // Color palette for additional teams
    const colorPalette = [
      '#DC2626', '#1E40AF', '#0284C7', '#B91C1C', '#EA580C', '#059669',
      '#7C3AED', '#DB2777', '#0D9488', '#65A30D', '#2563EB', '#F59E0B',
      '#6366F1', '#8B5CF6', '#EF4444', '#10B981', '#F97316', '#3B82F6',
      '#8B5A2B', '#EC4899', '#14B8A6', '#84CC16', '#6366F1', '#A855F7',
      '#F43F5E', '#06B6D4', '#EAB308', '#22C55E', '#F472B6', '#64748B'
    ];

    // Function to get color for a team
    const getTeamColor = (team, index) => {
      if (teamColors[team]) {
        return teamColors[team];
      }
      // Use color palette for teams not in the predefined colors
      return colorPalette[index % colorPalette.length];
    };

    // Create datasets for each team
    const datasets = selectedTeams.map((displayTeam, index) => {
      // Get the API team name for data lookup
      const apiTeamName = teamNameMapping[displayTeam] || displayTeam;
      const teamData = rankingData.filter(item => item.team_name === apiTeamName);
      
      console.log(`Team: ${displayTeam}, API Name: ${apiTeamName}, Data found:`, teamData.length);
      
      const dataPoints = dates.map(date => {
        const entry = teamData.find(item => item.date === date);
        return entry ? entry.rank : (gender === 'WWP' ? 27 : 22); // Use 27 for unranked women's teams, 22 for men's
      });

      const teamColor = getTeamColor(apiTeamName, index);

      return {
        label: displayTeam
          .replace('University of Southern California', 'USC')
          .replace('University of California-Los Angeles', 'UCLA')
          .replace('University of California-Irvine', 'UC Irvine')
          .replace('University of California-Santa Barbara', 'UC Santa Barbara')
          .replace('University of California-Davis', 'UC Davis')
          .replace('University of California-San Diego', 'UC San Diego')
          .replace('University of California', 'UC Berkeley')
          .replace('Stanford University', 'Stanford')
          .replace('Pepperdine University', 'Pepperdine')
          .replace('University of the Pacific', 'Pacific')
          .replace('Long Beach State University', 'Long Beach State')
          .replace('Princeton University', 'Princeton')
          .replace('Fordham University', 'Fordham')
          .replace('California Baptist University', 'Cal Baptist')
          .replace('Harvard University', 'Harvard')
          .replace('Brown University', 'Brown')
          .replace('Santa Clara University', 'Santa Clara')
          .replace('Loyola Marymount University', 'LMU')
          .replace('United States Naval Academy', 'Navy')
          .replace('San Jose State University', 'San Jose State')
          .replace('University of Hawaii', 'Hawaii')
          .replace('Fresno State', 'Fresno State')
          .replace('Arizona State University', 'Arizona State')
          .replace('Indiana University', 'Indiana')
          .replace('Wagner College', 'Wagner')
          .replace('University of Michigan', 'Michigan')
          .replace('Marist College', 'Marist')
          .replace('San Diego State University', 'San Diego State')
          .replace('McKendree University', 'McKendree')
          .replace('Pomona-Pitzer Colleges', 'Pomona-Pitzer'),
        data: dataPoints,
        borderColor: teamColor,
        backgroundColor: teamColor,
        fill: false,
        tension: 0.1,
        pointRadius: 4,
        pointHoverRadius: 8,
        pointBorderWidth: 2,
        pointBorderColor: '#ffffff',
        spanGaps: true // Connect points to show team progression including unranked periods
      };
    });

    return {
      labels: dates,
      datasets
    };
  };

  // Chart options with inverted Y-axis
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Team Rankings Over Time'
      },
      tooltip: {
        callbacks: {
          title: function(context) {
            return `Date: ${context[0].label}`;
          },
          label: function(context) {
            const rank = context.parsed.y;
            const rankDisplay = (gender === 'WWP' && rank === 27) || (gender === 'MWP' && rank === 22) ? 'Unranked' : `Rank ${rank}`;
            return `${context.dataset.label}: ${rankDisplay}`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date'
        },
        ticks: {
          maxTicksLimit: 10
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Ranking'
        },
        reverse: true, // This inverts the Y-axis (rank 1 at top)
        min: 0.5,
        max: gender === 'WWP' ? 27.5 : 22.5, // Extended to accommodate unranked position
        ticks: {
          stepSize: 1,
          callback: function(value) {
            // Only show integer values
            if ((gender === 'WWP' && value === 27) || (gender === 'MWP' && value === 22)) return 'UR';
            if (value === 21) return 'UR';
            if (value < 1) return '';
            return Math.floor(value);
          }
        }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    }
  };

  // Toggle team selection and auto-load data
  const toggleTeamSelection = (team) => {
    setSelectedTeams(prev => {
      const newSelectedTeams = prev.includes(team) 
        ? prev.filter(t => t !== team)
        : [...prev, team];
      
      // Auto-load ranking history when teams change
      if (newSelectedTeams.length > 0) {
        setTimeout(() => {
          fetchRankingHistoryWithTeams(newSelectedTeams);
        }, 100);
      } else {
        setRankingData([]);
      }
      
      return newSelectedTeams;
    });
  };

  // Fetch ranking history with specific teams
  const fetchRankingHistoryWithTeams = async (teams) => {
    try {
      setRankingLoading(true);
      const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://wpserver.onrender.com';
      
      // Team name mapping for API calls - mapping from full names to API expected names
      const teamNameMapping = {
        "University of California, San Diego": "University of California-San Diego",
        "University of California, Davis": "University of California-Davis", 
        "University of California, Santa Barbara": "University of California-Santa Barbara",
        "University of California, Irvine": "University of California-Irvine"
      };
      
      // Map team names to API expected names
      const mappedTeams = teams.map(team => teamNameMapping[team] || team);
      const teamNamesStr = mappedTeams.join(',');
      
      const startDate = dateRange.start.toISOString().split('T')[0];
      const endDate = dateRange.end.toISOString().split('T')[0];
      const url = `${BASE_URL}/${gender}/rankings/${encodeURIComponent(teamNamesStr)}/${startDate}/${endDate}`;
      
      console.log('Fetching ranking history from:', url);
      console.log('Original teams:', teams);
      console.log('Mapped teams:', mappedTeams);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      console.log('Received ranking data:', data);
      setRankingData(data.data || []);
    } catch (err) {
      console.error('Error fetching ranking history:', err);
      setRankingData([]);
    } finally {
      setRankingLoading(false);
    }
  };

  // Available teams for selection
  const allTeams = [
    'University of California-Los Angeles',
    'University of Southern California',
    'Fordham University',
    'Stanford University',
    'Princeton University',
    'Long Beach State University',
    'University of the Pacific',
    'University of California',
    'California Baptist University',
    'University of California-Irvine',
    'San Jose State University',
    'University of California-San Diego',
    'Pepperdine University',
    'University of California-Davis',
    'University of California-Santa Barbara',
    'Brown University',
    'Santa Clara University',
    'Harvard University',
    'Loyola Marymount University',
    'United States Naval Academy',
    'University of Hawaii',
    'Fresno State',
    'Arizona State University',
    'Indiana University',
    'Wagner College',
    'University of Michigan',
    'Marist College',
    'San Diego State University',
    'McKendree University',
    'Pomona-Pitzer Colleges'
  ];

  // Teams that don't have women's water polo programs
  const mensOnlyTeams = [
    'California Baptist University',
    'Fordham University',
    'Pepperdine University',
    'Santa Clara University',
    'United States Naval Academy'
  ];

  // Filter teams based on selected gender
  const availableTeams = gender === 'WWP' 
    ? allTeams.filter(team => !mensOnlyTeams.includes(team))
    : allTeams;

  // Auto-load ranking history on component mount for pre-selected teams
  useEffect(() => {
    if (selectedTeams.length > 0) {
      fetchRankingHistoryWithTeams(selectedTeams);
    }
  }, [dateRange, gender]); // Re-fetch when date range or gender changes

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
      {/* Navigation Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col items-center space-y-4 md:flex-row md:justify-between md:space-y-0">
            <div className="text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                College Sports Analytics
              </h1>
              <p className="text-gray-600 text-sm md:text-base">
                Statistical analysis and probability modeling for collegiate athletics
              </p>
            </div>
            
            {/* Sports & Division Selector */}
            <div className="flex flex-col items-center space-y-3 md:flex-row md:space-y-0 md:space-x-4">
              {/* Sport Selector - Future expansion */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Sport:</span>
                <div className="bg-gray-100 rounded-xl px-4 py-2 shadow-inner">
                  <span className="text-sm font-semibold text-gray-800">Water Polo</span>
                </div>
              </div>
              
              {/* Division Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Division:</span>
                <div className="flex items-center space-x-1 bg-gray-100 rounded-xl p-1 shadow-inner">
                  <button
                    onClick={() => setGender('MWP')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm ${
                      gender === 'MWP'
                        ? 'bg-blue-600 text-white shadow-md transform scale-105'
                        : 'text-gray-700 hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    Men's
                  </button>
                  <button
                    onClick={() => setGender('WWP')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm ${
                      gender === 'WWP'
                        ? 'bg-pink-600 text-white shadow-md transform scale-105'
                        : 'text-gray-700 hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    Women's
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Picker - Subtle and Clean */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4 pb-2">
        <div className="flex justify-center">
          <div className="inline-flex bg-gray-100 rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'matrix'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Parity Table
            </button>
            <button
              onClick={() => setActiveTab('rankings')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'rankings'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Ranking History
            </button>
          </div>
        </div>
      </div>

      {/* Sport Header */}
      <div className="text-center py-6 md:py-8 px-6">
        {activeTab === 'matrix' ? (
          <>
            <h2 className="text-3xl md:text-4xl font-thin text-gray-900 mb-4 tracking-tight">
              {gender === 'MWP' ? "Men's" : "Women's"} Division • {gender === 'MWP' ? '2008-2024' : '2010-2025'}
            </h2>
            <p className="text-lg md:text-xl font-light text-gray-600 mb-6">
              Win probabilities for differently ranked D1 water polo teams
            </p>
            <p className="text-sm md:text-base text-gray-500 max-w-2xl mx-auto leading-relaxed">
              Interactive matrix showing win probabilities between differently ranked teams,
              based on {gender === 'MWP' ? '2,815' : 'current season'} games played. Click on any cell to view specific matches.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-3xl md:text-4xl font-thin text-gray-900 mb-4 tracking-tight">
              {gender === 'MWP' ? "Men's" : "Women's"} Ranking History
            </h2>
            <p className="text-lg md:text-xl font-light text-gray-600 mb-6">
              Track team rankings over time since {gender === 'MWP' ? '2008' : '2010'}
            </p>
            <p className="text-sm md:text-base text-gray-500 max-w-2xl mx-auto leading-relaxed">
              Interactive charts showing how team rankings have changed over time. 
              Select teams and date ranges to analyze ranking trends and performance history.
            </p>
          </>
        )}
      </div>

      {/* Matrix Tab Content */}
      {activeTab === 'matrix' && (
        <>
          {/* Display Mode Toggle */}
          <div className="max-w-6xl mx-auto px-4 md:px-6 mb-6 md:mb-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
              <h3 className="text-base md:text-lg font-medium text-gray-900 mb-4">Display Format</h3>
              <div className="flex flex-wrap gap-2 md:gap-3">
                <button
                  onClick={() => setDisplayMode('decimal')}
                  className={`px-3 md:px-4 py-2 rounded-lg font-medium transition-all text-sm md:text-base ${
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
        </>
      )}

      {/* Ranking History Tab Content */}
      {activeTab === 'rankings' && (
        <div className="max-w-6xl mx-auto px-4 md:px-6 mb-8 md:mb-12">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
            <div className="mb-6">
              <h3 className="text-base md:text-lg font-medium text-gray-900">
                Ranking History
              </h3>
              <p className="text-gray-500 mt-1 text-sm">
                Track team rankings over time with interactive charts
              </p>
            </div>

            <div className="space-y-6">
              {/* Team Selection */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Select Teams
                </h4>
                
                {/* Selected Teams Display */}
                {selectedTeams.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {selectedTeams.map(team => (
                        <div
                          key={team}
                          className="inline-flex items-center px-3 py-2 rounded-full text-sm bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 border border-blue-200 shadow-sm hover:shadow-md transition-all duration-200"
                        >
                          <span className="mr-2 font-medium">
                            {team
                              .replace('University of Southern California', 'USC')
                              .replace('University of California-Los Angeles', 'UCLA')
                              .replace('University of California-Irvine', 'UC Irvine')
                              .replace('University of California-Santa Barbara', 'UC Santa Barbara')
                              .replace('University of California-Davis', 'UC Davis')
                              .replace('University of California-San Diego', 'UC San Diego')
                              .replace('University of California', 'UC Berkeley')
                              .replace('Stanford University', 'Stanford')
                              .replace('Pepperdine University', 'Pepperdine')
                              .replace('University of the Pacific', 'Pacific')
                              .replace('Long Beach State University', 'Long Beach State')
                              .replace('Princeton University', 'Princeton')
                              .replace('Fordham University', 'Fordham')
                              .replace('California Baptist University', 'Cal Baptist')
                              .replace('Harvard University', 'Harvard')
                              .replace('Brown University', 'Brown')
                              .replace('Santa Clara University', 'Santa Clara')
                              .replace('Loyola Marymount University', 'LMU')
                              .replace('United States Naval Academy', 'Navy')
                              .replace('San Jose State University', 'San Jose State')
                              .replace('University of Hawaii', 'Hawaii')
                              .replace('Fresno State', 'Fresno State')
                              .replace('Arizona State University', 'Arizona State')
                              .replace('Indiana University', 'Indiana')
                              .replace('Wagner College', 'Wagner')
                              .replace('University of Michigan', 'Michigan')
                              .replace('Marist College', 'Marist')
                              .replace('San Diego State University', 'San Diego State')
                              .replace('McKendree University', 'McKendree')
                              .replace('Pomona-Pitzer Colleges', 'Pomona-Pitzer')
                            }
                          </span>
                          <button
                            onClick={() => toggleTeamSelection(team)}
                            className="ml-1 p-1 rounded-full text-blue-600 hover:text-white hover:bg-blue-600 focus:outline-none transition-all duration-200"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Enhanced Dropdown Selector */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <svg className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value && !selectedTeams.includes(e.target.value)) {
                        toggleTeamSelection(e.target.value);
                      }
                      e.target.value = ''; // Reset dropdown
                    }}
                    className="w-full pl-12 pr-12 py-4 bg-white border-2 border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all duration-200 appearance-none text-base font-medium"
                  >
                    <option value="" disabled className="text-gray-500">
                      {selectedTeams.length === 0 ? 'Choose teams to track...' : 'Add another team...'}
                    </option>
                    {availableTeams
                      .filter(team => !selectedTeams.includes(team))
                      .map(team => (
                        <option key={team} value={team} className="py-2">
                          {team
                            .replace('University of Southern California', 'USC')
                            .replace('University of California-Los Angeles', 'UCLA')
                            .replace('University of California-Irvine', 'UC Irvine')
                            .replace('University of California-Santa Barbara', 'UC Santa Barbara')
                            .replace('University of California-Davis', 'UC Davis')
                            .replace('University of California-San Diego', 'UC San Diego')
                            .replace('University of California', 'UC Berkeley')
                            .replace('Stanford University', 'Stanford')
                            .replace('Pepperdine University', 'Pepperdine')
                            .replace('University of the Pacific', 'Pacific')
                            .replace('Long Beach State University', 'Long Beach State')
                            .replace('Princeton University', 'Princeton')
                            .replace('Fordham University', 'Fordham')
                            .replace('California Baptist University', 'Cal Baptist')
                            .replace('Harvard University', 'Harvard')
                            .replace('Brown University', 'Brown')
                            .replace('Santa Clara University', 'Santa Clara')
                            .replace('Loyola Marymount University', 'LMU')
                            .replace('United States Naval Academy', 'Navy')
                            .replace('San Jose State University', 'San Jose State')
                            .replace('University of Hawaii', 'Hawaii')
                            .replace('Fresno State', 'Fresno State')
                            .replace('Arizona State University', 'Arizona State')
                            .replace('Indiana University', 'Indiana')
                            .replace('Wagner College', 'Wagner')
                            .replace('University of Michigan', 'Michigan')
                            .replace('Marist College', 'Marist')
                            .replace('San Diego State University', 'San Diego State')
                            .replace('McKendree University', 'McKendree')
                            .replace('Pomona-Pitzer Colleges', 'Pomona-Pitzer')
                          }
                        </option>
                      ))
                    }
                  </select>
                  
                  {/* Enhanced dropdown arrow */}
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <div className="p-1 rounded-full bg-gray-100 group-focus-within:bg-blue-100 transition-colors">
                      <svg className="w-4 h-4 text-gray-500 group-focus-within:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Subtle background gradient */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </div>

                {/* Enhanced Clear All Button */}
                {selectedTeams.length > 0 && (
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">
                      {selectedTeams.length} team{selectedTeams.length !== 1 ? 's' : ''} selected
                    </span>
                    <button
                      onClick={() => {
                        setSelectedTeams([]);
                        setRankingData([]);
                      }}
                      className="inline-flex items-center px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg font-medium transition-all duration-200 group"
                    >
                      <svg className="w-4 h-4 mr-1 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Clear all teams
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Probability Matrix - only show when matrix tab is active */}
      {activeTab === 'matrix' && (
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
      )}

      {/* Ranking History Tab Content */}
      {activeTab === 'rankings' && (
        <div className="max-w-6xl mx-auto px-4 md:px-6 mb-8 md:mb-12">
          <div className="space-y-6">
            {/* Date Range */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Date Range
              </h4>
              
              {/* Quick Preset Buttons */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {gender === 'MWP' ? (
                    <>
                      <button
                        onClick={() => setDateRange({ start: new Date('2024-01-01'), end: new Date('2024-12-31') })}
                        className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                          dateRange.start.getFullYear() === 2024 && dateRange.end.getFullYear() === 2024 &&
                          dateRange.start.getMonth() === 0 && dateRange.end.getMonth() === 11
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                        }`}
                      >
                        2024 Season
                      </button>
                      <button
                        onClick={() => setDateRange({ start: new Date('2023-01-01'), end: new Date('2023-12-31') })}
                        className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                          dateRange.start.getFullYear() === 2023 && dateRange.end.getFullYear() === 2023 &&
                          dateRange.start.getMonth() === 0 && dateRange.end.getMonth() === 11
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                        }`}
                      >
                        2023 Season
                      </button>
                      <button
                        onClick={() => setDateRange({ start: new Date('2019-01-01'), end: new Date('2024-12-31') })}
                        className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                          dateRange.start.getFullYear() === 2019 && dateRange.end.getFullYear() === 2024 &&
                          dateRange.start.getMonth() === 0 && dateRange.end.getMonth() === 11
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                        }`}
                      >
                        Recent Years
                      </button>
                      <button
                        onClick={() => setDateRange({ start: new Date('2008-01-01'), end: new Date('2024-12-31') })}
                        className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                          dateRange.start.getFullYear() === 2008 && dateRange.end.getFullYear() === 2024 &&
                          dateRange.start.getMonth() === 0 && dateRange.end.getMonth() === 11
                            ? 'bg-gray-700 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        All Years
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setDateRange({ start: new Date('2025-01-01'), end: new Date('2025-06-01') })}
                        className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                          dateRange.start.getFullYear() === 2025 && dateRange.end.getFullYear() === 2025 &&
                          dateRange.start.getMonth() === 0 && dateRange.end.getMonth() === 5
                            ? 'bg-pink-600 text-white shadow-lg'
                            : 'bg-pink-50 text-pink-600 hover:bg-pink-100'
                        }`}
                      >
                        2025 Season
                      </button>
                      <button
                        onClick={() => setDateRange({ start: new Date('2024-01-01'), end: new Date('2024-12-31') })}
                        className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                          dateRange.start.getFullYear() === 2024 && dateRange.end.getFullYear() === 2024 &&
                          dateRange.start.getMonth() === 0 && dateRange.end.getMonth() === 11
                            ? 'bg-pink-600 text-white shadow-lg'
                            : 'bg-pink-50 text-pink-600 hover:bg-pink-100'
                        }`}
                      >
                        2024 Season
                      </button>
                      <button
                        onClick={() => setDateRange({ start: new Date('2019-01-01'), end: new Date('2025-12-31') })}
                        className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                          dateRange.start.getFullYear() === 2019 && dateRange.end.getFullYear() === 2025 &&
                          dateRange.start.getMonth() === 0 && dateRange.end.getMonth() === 11
                            ? 'bg-pink-600 text-white shadow-lg'
                            : 'bg-pink-50 text-pink-600 hover:bg-pink-100'
                        }`}
                      >
                        Recent Years
                      </button>
                      <button
                        onClick={() => setDateRange({ start: new Date('2008-01-01'), end: new Date('2025-12-31') })}
                        className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                          dateRange.start.getFullYear() === 2008 && dateRange.end.getFullYear() === 2025 &&
                          dateRange.start.getMonth() === 0 && dateRange.end.getMonth() === 11
                            ? 'bg-gray-700 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        All Years (2008-2025)
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Custom Date Display */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    From Date
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <DatePicker
                      selected={dateRange.start}
                      onChange={(date) => setDateRange(prev => ({ ...prev, start: date }))}
                      customInput={
                        <input
                          className="custom-date-input start-date"
                          readOnly
                        />
                      }
                      dateFormat="MMMM d, yyyy"
                      maxDate={new Date()}
                      minDate={new Date('2008-01-01')}
                      showYearDropdown
                      showMonthDropdown
                      dropdownMode="select"
                      placeholderText="Select start date"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 pointer-events-none"></div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    To Date
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                      <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <DatePicker
                      selected={dateRange.end}
                      onChange={(date) => setDateRange(prev => ({ ...prev, end: date }))}
                      customInput={
                        <input
                          className="custom-date-input end-date"
                          readOnly
                        />
                      }
                      dateFormat="MMMM d, yyyy"
                      maxDate={new Date()}
                      minDate={dateRange.start}
                      showYearDropdown
                      showMonthDropdown
                      dropdownMode="select"
                      placeholderText="Select end date"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 pointer-events-none"></div>
                  </div>
                </div>
              </div>
              
              {/* Date Range Display */}
              <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 font-medium">Selected Range:</span>
                  <span className="text-blue-700 font-semibold">
                    {dateRange.start.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })} - {dateRange.end.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Chart */}
            {rankingLoading && selectedTeams.length > 0 && (
              <div className="flex justify-center py-8">
                <div className="flex items-center space-x-2 text-blue-600">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="text-sm font-medium">Loading ranking history...</span>
                </div>
              </div>
            )}

            {rankingData.length > 0 && (
              <div className="h-96 w-full">
                <Line data={prepareChartData()} options={chartOptions} />
              </div>
            )}

            {/* No Data Message */}
            {!rankingLoading && rankingData.length === 0 && selectedTeams.length > 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  No ranking data found for the selected teams and date range.
                </p>
              </div>
            )}

            {/* No Teams Selected Message */}
            {selectedTeams.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  Select one or more teams above to view their ranking history.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

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