import React, { useState, useEffect, useMemo } from 'react';
import { useTable, useSortBy } from 'react-table';
import io from 'socket.io-client';
import './statScreen.css';
import { useUserContext } from "./providers/UserProvider";

const socket = io('http://localhost:5000'); // Connect to the backend server

const StatScreen = ({ setPage }) => {
  const [stats, setStats] = useState([]);
  const [timeHorizon, setTimeHorizon] = useState('all'); // 'all' or 'lastHour'
  const currentUsername = useUserContext();

  const handleHomeScreen = () => {
    setPage('main');
  };

  // Define columns for react-table
  const columns = useMemo(() => [
    { Header: 'Player', accessor: 'username' },
    { Header: 'Games Played', accessor: 'gamesPlayed' },
    { Header: 'Games Won', accessor: 'gamesWon' },
    { Header: 'Win Ratio', accessor: d => (d.gamesPlayed ? (d.gamesWon / d.gamesPlayed).toFixed(2) : (0).toFixed(2)), id: 'winRatio' },
    { Header: 'Total Guesses', accessor: 'totalGuesses' },
    { Header: 'Average Guesses/Game', accessor: d => (d.gamesPlayed ? (d.totalGuesses / d.gamesPlayed).toFixed(2) : (0).toFixed(2)), id: 'avgGuesses' },
    { Header: 'Average Time/Game (s)', accessor: d => (d.gamesPlayed ? (d.secondsPlayed / d.gamesPlayed).toFixed(2) : (0).toFixed(2)), id: 'avgTime' },
  ], []);

  // Fetch stats on component mount and listen for updates
  useEffect(() => {
    const fetchStats = async () => {
        // Determine the endpoint based on the timeHorizon state
        const endpoint = timeHorizon === 'all' ? 'http://localhost:5000/stats' : 'http://localhost:5000/stats/lasthour';
        const response = await fetch(endpoint);
        const data = await response.json();
        setStats(data);
    };

    fetchStats();

    socket.on('updateStats', (updatedStats) => {
      fetchStats();
    });

    return () => {
      socket.off('updateStats');
    };
  }, [timeHorizon]);

  // React table hook
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable({ columns, data: stats }, useSortBy);


  // TODO: Add highlighting for the current user.
  return (
    <div>
      <h2>Player Stats</h2>
      <div>      
        <button className="back-to-main" onClick={handleHomeScreen}>
        Back to Main
      </button>
        <button onClick={() => setTimeHorizon('all')}>All Time</button>
        <button onClick={() => setTimeHorizon('lastHour')}>Last Hour</button>
      </div>
      <table {...getTableProps()} className="stats-table">
        <thead>
          {headerGroups.map(headerGroup => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map(column => (
                <th {...column.getHeaderProps(column.getSortByToggleProps())}>
                  {column.render('Header')}
                  <span>
                    {column.isSorted ? (column.isSortedDesc ? ' 🔽' : ' 🔼') : ''}
                  </span>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map(row => {
            prepareRow(row);
            const isCurrentUserRow = row.original.username === currentUsername;
            return (
            <tr {...row.getRowProps()} className={isCurrentUserRow ? 'highlight-row' : ''}>
              {row.cells.map(cell => {
                return (
                <td {...cell.getCellProps()}>
                  {cell.render('Cell')}
                  </td>
                );})}
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default StatScreen;
