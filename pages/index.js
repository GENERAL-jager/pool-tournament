import React, { useState, useEffect } from 'react';
import { Trophy, User, Calendar, RotateCcw, Save, Share2, Download, Upload, AlertCircle } from 'lucide-react';

export default function PoolTournament() {
  const [players, setPlayers] = useState(['Jonte', 'Sammy', 'Gitai']);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [games, setGames] = useState([]);
  const [currentDay, setCurrentDay] = useState(1);
  const [tournamentId, setTournamentId] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    loadTournament();
  }, []);

  useEffect(() => {
    if (games.length > 0 && tournamentId) {
      autoSave();
    }
  }, [games, players]);

  const loadTournament = async () => {
    try {
      // Check if there's a tournament ID in the URL
      const urlParams = new URLSearchParams(window.location.search);
      const urlTournamentId = urlParams.get('tournament');
      
      if (urlTournamentId) {
        // Load shared tournament
        setTournamentId(urlTournamentId);
        const result = await window.storage.get(`tournament:${urlTournamentId}`, true);
        
        if (result && result.value) {
          const data = JSON.parse(result.value);
          setPlayers(data.players);
          setGames(data.games);
          setSaveStatus('Loaded shared tournament');
          setLoading(false);
          return;
        }
      }
      
      // Try to load from personal storage
      const personalResult = await window.storage.get('my-tournament');
      
      if (personalResult && personalResult.value) {
        const data = JSON.parse(personalResult.value);
        setPlayers(data.players);
        setGames(data.games);
        setTournamentId(data.tournamentId || '');
        setSaveStatus('Loaded saved tournament');
      } else {
        // Initialize new tournament
        const newGames = initializeGames();
        const newId = generateTournamentId();
        setGames(newGames);
        setTournamentId(newId);
        setSaveStatus('New tournament created');
      }
    } catch (error) {
      console.error('Error loading tournament:', error);
      // Initialize new tournament on error
      const newGames = initializeGames();
      const newId = generateTournamentId();
      setGames(newGames);
      setTournamentId(newId);
      setSaveStatus('New tournament created');
    }
    setLoading(false);
  };

  const generateTournamentId = () => {
    return 'pool-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  };

  const initializeGames = () => {
    const allGames = [];
    const rotation = [
      [0, 1, 2], [1, 2, 0], [2, 0, 1]
    ];
    
    let gameNum = 1;
    
    // Days 1-3: 7 games each
    for (let day = 1; day <= 3; day++) {
      for (let game = 0; game < 7; game++) {
        const rotationIndex = game % 3;
        allGames.push({
          id: gameNum,
          day: day,
          order: rotation[rotationIndex],
          winner: null
        });
        gameNum++;
      }
    }
    
    // Day 4: 7 games
    for (let game = 0; game < 7; game++) {
      const rotationIndex = game % 3;
      allGames.push({
        id: gameNum,
        day: 4,
        order: rotation[rotationIndex],
        winner: null
      });
      gameNum++;
    }
    
    return allGames;
  };

  const autoSave = async () => {
    try {
      const data = {
        players,
        games,
        tournamentId,
        lastUpdated: new Date().toISOString()
      };
      
      // Save to personal storage
      await window.storage.set('my-tournament', JSON.stringify(data));
      
      // Save to shared storage so others can view
      await window.storage.set(`tournament:${tournamentId}`, JSON.stringify(data), true);
      
      setSaveStatus('✓ Saved');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      console.error('Error saving:', error);
      setSaveStatus('Error saving');
    }
  };

  const handleWinner = (gameId, playerIndex) => {
    setGames(games.map(game => 
      game.id === gameId ? { ...game, winner: playerIndex } : game
    ));
  };

  const getWinCount = (playerIndex) => {
    return games.filter(game => game.winner === playerIndex).length;
  };

  const getDayGames = (day) => {
    return games.filter(game => game.day === day);
  };

  const updatePlayerName = (index, newName) => {
    const newPlayers = [...players];
    newPlayers[index] = newName;
    setPlayers(newPlayers);
    setEditingPlayer(null);
  };

  const resetTournament = async () => {
    if (confirm('Are you sure you want to reset the entire tournament? This will clear all game results.')) {
      const newGames = initializeGames();
      const newId = generateTournamentId();
      setGames(newGames);
      setTournamentId(newId);
      setSaveStatus('Tournament reset');
      
      try {
        const data = {
          players,
          games: newGames,
          tournamentId: newId,
          lastUpdated: new Date().toISOString()
        };
        await window.storage.set('my-tournament', JSON.stringify(data));
        await window.storage.set(`tournament:${newId}`, JSON.stringify(data), true);
      } catch (error) {
        console.error('Error saving reset:', error);
      }
    }
  };

  const shareLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?tournament=${tournamentId}`;
    setShareUrl(url);
    navigator.clipboard.writeText(url);
    setSaveStatus('✓ Link copied to clipboard!');
    setTimeout(() => {
      setSaveStatus('');
      setShareUrl('');
    }, 5000);
  };

  const exportData = () => {
    const data = {
      players,
      games,
      tournamentId,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pool-tournament-${tournamentId}.json`;
    a.click();
    setSaveStatus('✓ Exported');
    setTimeout(() => setSaveStatus(''), 2000);
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          setPlayers(data.players);
          setGames(data.games);
          setTournamentId(data.tournamentId);
          setSaveStatus('✓ Imported successfully');
          setTimeout(() => setSaveStatus(''), 2000);
        } catch (error) {
          setSaveStatus('Error importing file');
          console.error('Import error:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const getLeaderboard = () => {
    return players
      .map((name, index) => ({
        name,
        wins: getWinCount(index),
        index
      }))
      .sort((a, b) => b.wins - a.wins);
  };

  const gamesPerDay = [7, 7, 7, 7];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading tournament...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Pool Tournament Tracker</h1>
                <p className="text-sm text-gray-500">Tournament ID: {tournamentId.slice(-8)}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={shareLink}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={exportData}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <label className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition cursor-pointer">
                <Upload className="w-4 h-4" />
                Import
                <input
                  type="file"
                  accept=".json"
                  onChange={importData}
                  className="hidden"
                />
              </label>
              <button
                onClick={resetTournament}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>

          {/* Save Status */}
          {saveStatus && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
              <Save className="w-4 h-4" />
              {saveStatus}
            </div>
          )}

          {/* Share URL Display */}
          {shareUrl && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700 mb-2 font-semibold">Share this link with other players:</p>
              <code className="text-xs bg-white p-2 rounded block overflow-x-auto">{shareUrl}</code>
            </div>
          )}

          {/* Info Banner */}
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Auto-save enabled:</strong> All changes are automatically saved and shared online. Other players can view live updates using the share link.
            </div>
          </div>
          
          {/* Players */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {players.map((player, index) => (
              <div key={index} className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-5 h-5 text-green-700" />
                  {editingPlayer === index ? (
                    <input
                      type="text"
                      value={player}
                      onChange={(e) => updatePlayerName(index, e.target.value)}
                      onBlur={() => setEditingPlayer(null)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditingPlayer(null)}
                      className="flex-1 px-2 py-1 border rounded"
                      autoFocus
                    />
                  ) : (
                    <span
                      onClick={() => setEditingPlayer(index)}
                      className="flex-1 font-semibold text-gray-800 cursor-pointer hover:text-green-700"
                    >
                      {player}
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold text-green-700">
                  {getWinCount(index)} wins
                </div>
              </div>
            ))}
          </div>

          {/* Leaderboard */}
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-4 rounded-lg border-2 border-yellow-300">
            <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-600" />
              Current Standings
            </h2>
            <div className="space-y-2">
              {getLeaderboard().map((player, index) => (
                <div key={player.index} className="flex items-center justify-between bg-white p-3 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                    <span className="font-semibold text-gray-800">{player.name}</span>
                  </div>
                  <span className="text-xl font-bold text-green-700">{player.wins}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Day Selector */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[1, 2, 3, 4].map(day => (
            <button
              key={day}
              onClick={() => setCurrentDay(day)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition whitespace-nowrap ${
                currentDay === day
                  ? 'bg-white text-green-700 shadow-lg'
                  : 'bg-white/80 text-gray-600 hover:bg-white'
              }`}
            >
              <Calendar className="w-5 h-5" />
              Day {day} ({gamesPerDay[day - 1]} games)
            </button>
          ))}
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {getDayGames(currentDay).map((game) => (
            <div key={game.id} className="bg-white rounded-lg shadow-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Game {game.id}</h3>
                <span className="text-sm text-gray-500">Day {game.day}</span>
              </div>
              
              <div className="space-y-2">
                {game.order.map((playerIndex, position) => (
                  <button
                    key={playerIndex}
                    onClick={() => handleWinner(game.id, playerIndex)}
                    className={`w-full p-3 rounded-lg text-left transition ${
                      game.winner === playerIndex
                        ? 'bg-green-600 text-white shadow-lg transform scale-105'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`text-xs ${game.winner === playerIndex ? 'text-green-100' : 'text-gray-500'}`}>
                          {position === 0 ? '1st Turn' : position === 1 ? '2nd Turn' : '3rd Turn'}
                        </span>
                        <div className="font-semibold">{players[playerIndex]}</div>
                      </div>
                      {game.winner === playerIndex && (
                        <Trophy className="w-5 h-5" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              
              {game.winner === null && (
                <p className="text-sm text-gray-500 mt-3 text-center">Click winner to record result</p>
              )}
            </div>
          ))}
        </div>

        {/* Tournament Progress */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Tournament Progress</h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-200 rounded-full h-4">
              <div
                className="bg-green-600 h-4 rounded-full transition-all duration-500"
                style={{
                  width: `${(games.filter(g => g.winner !== null).length / 28) * 100}%`
                }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-700">
              {games.filter(g => g.winner !== null).length} / 25 games
            </span>
          </div>
        </div>
      </div>
    </div>
  );
                         }
