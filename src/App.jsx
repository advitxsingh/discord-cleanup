import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  Trash2,
  Search,
  Play,
  Square,
  User,
  Key,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Terminal,
  HelpCircle
} from 'lucide-react';
import { DiscordService } from './DiscordService';

const STEPS = {
  TOKEN: 'token',
  GUILD: 'guild',
  PURGE: 'purge'
};

function App() {
  const [step, setStep] = useState(STEPS.TOKEN);
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [guilds, setGuilds] = useState([]);
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ total: 0, deleted: 0, failed: 0 });
  const [isRunning, setIsRunning] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const logEndRef = useRef(null);

  const addLog = (message, type = 'info') => {
    setLogs(prev => [...prev.slice(-99), { id: Date.now(), message, type, time: new Date().toLocaleTimeString('en-US', { hour12: false }) }]);
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleVerifyToken = async () => {
    setLoading(true);
    setError('');
    const cleanToken = token.replace(/["']/g, '').trim();
    try {
      const userData = await DiscordService.testToken(cleanToken);
      setUser(userData);
      const guildData = await DiscordService.getGuilds(cleanToken);
      setGuilds(guildData.sort((a, b) => a.name.localeCompare(b.name)));
      setToken(cleanToken);
      setStep(STEPS.GUILD);
      addLog(`Authenticated: ${userData.username}`, 'success');
    } catch (err) {
      setError(err.message);
      addLog(`Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const startPurge = async () => {
    setIsRunning(true);
    setStats({ total: 0, deleted: 0, failed: 0 });
    setLogs([]);
    addLog(`Target: ${selectedGuild.name}`, 'info');

    let stopRequested = false;

    while (true) {
      if (!isRunning && stats.total > 0) break;

      try {
        addLog(`Searching messages...`, 'info');
        const searchData = await DiscordService.searchMessages(token, selectedGuild.id, user.id, 0);

        if (!searchData || !searchData.messages) {
          addLog('Discord search has not indexed these messages yet. Try again in a few minutes.', 'warning');
          break;
        }

        const messages = searchData.messages.flat();
        if (messages.length === 0) {
          addLog('Cleanup finished: No more messages found.', 'success');
          break;
        }

        if (stats.total === 0) {
          setStats(prev => ({ ...prev, total: searchData.total_results }));
        }

        for (const msg of messages) {
          if (window.stopRequested) {
            addLog('Stopped by user.', 'warning');
            stopRequested = true;
            break;
          }

          addLog(`Deleting: ${msg.id}`, 'info');
          const success = await DiscordService.deleteMessage(token, msg.channel_id, msg.id);

          if (success) {
            setStats(prev => ({ ...prev, deleted: prev.deleted + 1 }));
          } else {
            setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
          }

          await new Promise(r => setTimeout(r, 1200));
        }

        if (stopRequested) break;
        await new Promise(r => setTimeout(r, 2000));
      } catch (err) {
        addLog(`API Error: ${err.message}`, 'error');
        break;
      }
    }

    setIsRunning(false);
    window.stopRequested = false;
  };

  const stopPurge = () => {
    window.stopRequested = true;
    setIsRunning(false);
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Discord Cleanup</h1>
        <button onClick={() => setShowHelp(!showHelp)} className="btn-help">
          <HelpCircle size={14} /> HELP
        </button>
      </header>

      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="help-content"
          >
            <h3>How to get your token</h3>
            <div className="step">
              <b>1. Login</b>
              Log in to discord.com in Chrome or Edge.
            </div>
            <div className="step">
              <b>2. DevTools</b>
              Press <kbd>F12</kbd> or <kbd>Ctrl+Shift+I</kbd>.
            </div>
            <div className="step">
              <b>3. Find Authorization</b>
              In the <b>Network</b> tab, look for a request named <code>messages</code>. Look in <b>Headers</b> for <code>authorization</code>. copy that string.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main>
        {step === STEPS.TOKEN && (
          <div className="card">

            <div className="field-group">
              <label className="label">Account Token</label>
              <input
                type="password"
                placeholder="Paste token here..."
                className="input-field"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>

            {error && <p className="label" style={{ color: 'var(--danger)', marginBottom: '12px' }}>{error}</p>}

            <button
              onClick={handleVerifyToken}
              disabled={!token || loading}
              className="btn-primary"
            >
              {loading ? <Loader2 className="spinner" size={16} style={{ margin: 'auto' }} /> : "CONNECT"}
            </button>
          </div>
        )}

        {step === STEPS.GUILD && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={16} color="var(--accent)" />
                <span style={{ fontWeight: 600 }}>{user.username}</span>
              </div>
              <button onClick={() => setStep(STEPS.TOKEN)} className="btn-help">Switch Account</button>
            </div>

            <label className="label">Select Server</label>
            <div className="guild-list">
              {guilds.map(guild => (
                <button
                  key={guild.id}
                  onClick={() => setSelectedGuild(guild)}
                  className={`guild-item ${selectedGuild?.id === guild.id ? 'selected' : ''}`}
                >
                  <div className="guild-info">
                    {guild.icon ? (
                      <img src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`} className="guild-icon" />
                    ) : (
                      <div className="guild-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>{guild.name[0]}</div>
                    )}
                    <span>{guild.name}</span>
                  </div>
                  {selectedGuild?.id === guild.id && <CheckCircle2 size={14} color="var(--accent)" />}
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(STEPS.PURGE)}
              disabled={!selectedGuild}
              className="btn-primary"
              style={{ marginTop: '20px' }}
            >
              SELECT {selectedGuild?.name.toUpperCase()}
            </button>
          </div>
        )}

        {step === STEPS.PURGE && (
          <div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Total</div>
                <div className="stat-value">{stats.total}</div>
              </div>
              <div className="stat-card" style={{ borderColor: 'var(--success)' }}>
                <div className="stat-label" style={{ color: 'var(--success)' }}>Deleted</div>
                <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.deleted}</div>
              </div>
              <div className="stat-card" style={{ borderColor: 'var(--danger)' }}>
                <div className="stat-label" style={{ color: 'var(--danger)' }}>Failed</div>
                <div className="stat-value" style={{ color: 'var(--danger)' }}>{stats.failed}</div>
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Terminal size={14} color="var(--accent)" />
                  <span className="label" style={{ margin: 0 }}>Console</span>
                </div>
                {!isRunning ? (
                  <button onClick={startPurge} className="btn-primary" style={{ width: 'auto', padding: '6px 16px' }}>START</button>
                ) : (
                  <button onClick={stopPurge} className="btn-danger">STOP</button>
                )}
              </div>

              <div className="log-box">
                {logs.length === 0 && <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>Awaiting start...</div>}
                {logs.map(log => (
                  <div key={log.id} className="log-entry">
                    <span className="log-time">[{log.time}]</span>
                    <span className={`log-msg ${log.type}`}>{log.message}</span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>

              <div style={{ marginTop: '12px', textAlign: 'right' }}>
                <button onClick={() => setStep(STEPS.GUILD)} disabled={isRunning} className="btn-help" style={{ border: 'none' }}>Back to servers</button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-dim)', fontSize: '11px', fontWeight: 600, letterSpacing: '1px' }}>
        DISCORD CLEANUP — PRO EDITION
      </footer>
    </div>
  );
}

export default App;
