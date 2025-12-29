import React, { useState, useEffect } from 'react';
import { Trophy, User, Calendar, RotateCcw, Save, Share2, Download, Upload, AlertCircle } from 'lucide-react';

export default function PoolTournament() {
  const [players, setPlayers] = useState(['Jonte', 'Sammy', 'Gitai', 'Paul']);
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
      const urlParams = new URLSearchParams(window.location.search);
      const urlTournamentId = urlParams.get('tournament');
      
      if (urlTournamentId) {
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
      
      const personalResult = await window.storage.get('my-tournament');
      
      if (personalResult && personalResult.value) {
        const data = JSON.parse(personalResult.value);
        setPlayers(data.players);
        setGames(data.games);
        setTournamentId(data.tournamentId || '');
        setSaveStatus('Loaded saved tournament');
      } else {
        const newGames = initializeGames();
        const newId = generateTournamentId();
        setGames(newGames);
        setTournamentId(newId);
        setSaveStatus('New tournament created');
      }
    } catch (error) {
      console.error('Error loading tournament:', error);
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
    // For 4 players, we need proper round-robin rotations
    const rotations = generateRotations();
    
    let gameNum = 1;
    
    // Create 4 days with 10 games each
    for (let day = 1; day <= 4; day++) {
      for (let game = 0; game < 10; game++) {
        // Use a different rotation for each game to ensure fair play
        const rotationIndex = (day - 1) * 10 + game;
        const rotation = rotations[rotationIndex % rotations.length];
        
        allGames.push({
          id: gameNum,
          day: day,
          order: rotation,
          winner: null
        });
        gameNum++;
      }
    }
    
    return allGames;
  };

  const generateRotations = () => {
    // Generate all unique 4-player rotations for fair tournament play
    const rotations = [];
    const players = [0, 1, 2, 3];
    
    // Create rotations for different starting positions
    for (let start = 0; start < 4; start++) {
      // Different player orders
      rotations.push([start, (start + 1) % 4, (start + 2) % 4, (start + 3) % 4]);
      rotations.push([start, (start + 2) % 4, (start + 3) % 4, (start + 1) % 4]);
      rotations.push([start, (start + 3) % 4, (start + 1) % 4, (start + 2) % 4]);
    }
    
    return rotations;
  };

  const autoSave = async () => {
    try {
      const data = {
        players,
        games,
        tournamentId,
        lastUpdated: new Date().toISOString()
      };
      
      await window.storage.set('my-tournament', JSON.stringify(data));
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

  const gamesPerDay = [10, 10, 10, 10]; // 10 games per day for 4 days

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 font-light">Loading tournament...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
            <div>
              <h1 className="text-3xl font-light text-gray-900 tracking-tight mb-2">4-Player Pool Tournament</h1>
              <p className="text-gray-500 text-sm font-mono">ID: {tournamentId.slice(-8)}</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={shareLink}
                className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={exportData}
                className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <label className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-2 cursor-pointer">
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
                className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>

          {saveStatus && (
            <div className="mb-4 p-3 bg-gray-100 rounded text-gray-600 text-sm flex items-center gap-2">
              <Save className="w-4 h-4" />
              {saveStatus}
            </div>
          )}

          {shareUrl && (
            <div className="mb-4 p-3 bg-gray-100 rounded">
              <p className="text-sm text-gray-700 mb-2 font-medium">Share link:</p>
              <code className="text-xs font-mono bg-white p-2 rounded block overflow-x-auto border">
                {shareUrl}
              </code>
            </div>
          )}

          <div className="mb-6 p-3 bg-gray-100 rounded text-gray-600 text-sm flex items-start gap-2 border-l-4 border-gray-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-medium">4 Players × 10 Games/Day × 4 Days = 40 Total Games</strong>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Column - Players & Leaderboard */}
          <div className="lg:col-span-1 space-y-6">
            {/* Players */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 tracking-tight">Players</h2>
              <div className="space-y-3">
                {players.map((player, index) => (
                  <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                        <span className="font-medium text-gray-700">{player.charAt(0)}</span>
                      </div>
                      {editingPlayer === index ? (
                        <input
                          type="text"
                          value={player}
                          onChange={(e) => updatePlayerName(index, e.target.value)}
                          onBlur={() => setEditingPlayer(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingPlayer(null)}
                          className="px-2 py-1 border rounded font-medium focus:outline-none focus:ring-1 focus:ring-gray-400"
                          autoFocus
                        />
                      ) : (
                        <span
                          onClick={() => setEditingPlayer(index)}
                          className="font-medium text-gray-900 cursor-pointer hover:text-gray-600"
                        >
                          {player}
                        </span>
                      )}
                    </div>
                    <div className="font-medium text-gray-700">
                      {getWinCount(index)} <span className="text-gray-400 text-sm">wins</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-medium text-gray-900 tracking-tight">Standings</h2>
              </div>
              <div className="space-y-3">
                {getLeaderboard().map((player, index) => (
                  <div key={player.index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
                      <span className="font-medium text-gray-900">{player.name}</span>
                    </div>
                    <span className="font-medium text-gray-700">{player.wins}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Games & Controls */}
          <div className="lg:col-span-3 space-y-6">
            {/* Day Selector */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[1, 2, 3, 4].map(day => (
                <button
                  key={day}
                  onClick={() => setCurrentDay(day)}
                  className={`flex items-center gap-2 px-4 py-3 rounded border transition-colors whitespace-nowrap ${
                    currentDay === day
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-medium">Day {day}</div>
                    <div className="text-xs">{gamesPerDay[day - 1]} games</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Games Grid - 2 columns for 10 games */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {getDayGames(currentDay).map((game) => (
                <div key={game.id} className="bg-white rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">Game {game.id}</h3>
                    <span className="text-sm text-gray-500">D{game.day}</span>
                  </div>
                  
                  <div className="space-y-2">
                    {game.order.map((playerIndex, position) => (
                      <button
                        key={playerIndex}
                        onClick={() => handleWinner(game.id, playerIndex)}
                        className={`w-full p-3 rounded border text-left transition-all ${
                          game.winner === playerIndex
                            ? 'bg-gray-900 text-white border-gray-900 transform scale-[1.02]'
                            : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-gray-400 mb-1">
                              {position === 0 ? '1st' : position === 1 ? '2nd' : position === 2 ? '3rd' : '4th'}
                            </div>
                            <div className="font-medium text-sm">{players[playerIndex]}</div>
                          </div>
                          {game.winner === playerIndex && (
                            <Trophy className="w-4 h-4 text-yellow-300" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  {game.winner === null && (
                    <p className="text-xs text-gray-400 mt-3 text-center">Click winner</p>
                  )}
                </div>
              ))}
            </div>

            {/* Progress Bar */}
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">Tournament Progress</h3>
                <span className="text-sm text-gray-600">
                  {games.filter(g => g.winner !== null).length} / 40 games
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-900 transition-all duration-500"
                  style={{
                    width: `${(games.filter(g => g.winner !== null).length / 40) * 100}%`
                  }}
                />
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs text-gray-500">
                <div>Day 1: {getDayGames(1).filter(g => g.winner !== null).length}/10</div>
                <div>Day 2: {getDayGames(2).filter(g => g.winner !== null).length}/10</div>
                <div>Day 3: {getDayGames(3).filter(g => g.winner !== null).length}/10</div>
                <div>Day 4: {getDayGames(4).filter(g => g.winner !== null).length}/10</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
           }
