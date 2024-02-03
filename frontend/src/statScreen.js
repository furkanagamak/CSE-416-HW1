import React, { useState, useEffect, useMemo } from 'react';
import { useTable, useSortBy } from 'react-table';
import io from 'socket.io-client';
import './statScreen.css';

const socket = io('http://localhost:5000'); // Connect to the backend server

const StatScreen = () => {
  const [stats, setStats] = useState([]);
  const [timeHorizon, setTimeHorizon] = useState('all'); // 'all' or 'lastHour'

  const filterStatsByTime = (stats, timeHorizon) => {
    if (timeHorizon === 'lastHour') {
      const oneHourAgo = new Date(new Date().getTime() - (60 * 60 * 1000));
      return stats.filter(stat => new Date(stat.lastGameTime) > oneHourAgo);
    }
    return stats; // Return all stats for 'all'
  };

  // Define columns for react-table
  const columns = useMemo(() => [
    { Header: 'Player', accessor: 'username' },
    { Header: 'Games Played', accessor: 'gamesPlayed' },
    { Header: 'Games Won', accessor: 'gamesWon' },
    { Header: 'Win Ratio', accessor: d => (d.gamesPlayed ? (d.gamesWon / d.gamesPlayed).toFixed(2) : 0), id: 'winRatio' },
    { Header: 'Total Guesses', accessor: 'totalGuesses' },
    { Header: 'Average Guesses/Game', accessor: d => (d.gamesPlayed ? (d.totalGuesses / d.gamesPlayed).toFixed(2) : 0), id: 'avgGuesses' },
    { Header: 'Average Time/Game (s)', accessor: d => (d.gamesPlayed ? (d.secondsPlayed / d.gamesPlayed).toFixed(2) : 0), id: 'avgTime' },
  ], []);

  // Fetch stats on component mount and listen for updates
  useEffect(() => {
    const fetchStats = async () => {
      const response = await fetch('http://localhost:5000/stats');
      const data = await response.json();
      setStats(filterStatsByTime(data, timeHorizon));
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
            prepareRow(row)
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map(cell => {
                  return (
                    <td {...cell.getCellProps()} className={cell.column.id === 'username' ? 'highlight-player' : ''}>
                      {cell.render('Cell')}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  );
};

export default StatScreen;
