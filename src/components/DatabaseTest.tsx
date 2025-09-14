import React, { useState } from 'react'
import databaseService from '../services/database'
import './DatabaseTest.css'

interface TestResult {
  success: boolean
  error?: string
  details?: any
  timestamp: number
}

const DatabaseTest: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const addResult = (result: Omit<TestResult, 'timestamp'>) => {
    const newResult = { ...result, timestamp: Date.now() }
    setTestResults(prev => [newResult, ...prev])
    return newResult
  }

  const runConnectionTest = async () => {
    setIsRunning(true)
    addResult({ success: false, details: { status: 'Starting connection test...' } })

    try {
      const result = await databaseService.testConnection()
      addResult(result)
    } catch (error) {
      addResult({
        success: false,
        error: 'Connection test failed with exception',
        details: { error: error }
      })
    } finally {
      setIsRunning(false)
    }
  }

  const runTableCreationTest = async () => {
    setIsRunning(true)
    addResult({ success: false, details: { status: 'Creating mario_maps table...' } })

    try {
      const result = await databaseService.createTable()
      addResult(result)
    } catch (error) {
      addResult({
        success: false,
        error: 'Table creation failed with exception',
        details: { error: error }
      })
    } finally {
      setIsRunning(false)
    }
  }

  const runInsertTest = async () => {
    setIsRunning(true)
    addResult({ success: false, details: { status: 'Testing map insert...' } })

    try {
      const testMapData = {
        level_id: `test_${Date.now()}`,
        json_url: 'https://example.com/test.json',
        embed_url: 'https://example.com/embed/test',
        game_url: 'https://example.com/play/test',
        title: 'Database Test Level',
        description: 'This is a test level for database connectivity'
      }

      const result = await databaseService.publishMap(testMapData)
      addResult(result)
    } catch (error) {
      addResult({
        success: false,
        error: 'Insert test failed with exception',
        details: { error: error }
      })
    } finally {
      setIsRunning(false)
    }
  }

  const runQueryTest = async () => {
    setIsRunning(true)
    addResult({ success: false, details: { status: 'Testing map query...' } })

    try {
      const result = await databaseService.getPublishedMaps(5)
      addResult(result)
    } catch (error) {
      addResult({
        success: false,
        error: 'Query test failed with exception',
        details: { error: error }
      })
    } finally {
      setIsRunning(false)
    }
  }

  const clearResults = () => {
    setTestResults([])
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  if (!isVisible) {
    return (
      <div className="database-test-trigger">
        <button
          className="test-trigger-btn"
          onClick={() => setIsVisible(true)}
          title="Open Database Test Panel"
        >
          🔍 DB Test
        </button>
      </div>
    )
  }

  return (
    <div className="database-test-overlay">
      <div className="database-test-panel">
        <div className="test-header">
          <h3>🔍 Database Connection Test</h3>
          <button
            className="close-btn"
            onClick={() => setIsVisible(false)}
          >
            ✕
          </button>
        </div>

        <div className="test-info">
          <div className="config-status">
            <span className={`status-indicator ${databaseService.isConfigured() ? 'configured' : 'not-configured'}`}>
              {databaseService.isConfigured() ? '✅ Configured' : '❌ Not Configured'}
            </span>
          </div>
        </div>

        <div className="test-actions">
          <button
            className="test-btn primary"
            onClick={runConnectionTest}
            disabled={!databaseService.isConfigured() || isRunning}
          >
            {isRunning ? '🔄 Running...' : '🔗 Test Connection'}
          </button>

          <button
            className="test-btn secondary"
            onClick={runTableCreationTest}
            disabled={!databaseService.isConfigured() || isRunning}
          >
            📋 Create Table
          </button>

          <button
            className="test-btn secondary"
            onClick={runInsertTest}
            disabled={!databaseService.isConfigured() || isRunning}
          >
            ➕ Test Insert
          </button>

          <button
            className="test-btn secondary"
            onClick={runQueryTest}
            disabled={!databaseService.isConfigured() || isRunning}
          >
            📊 Test Query
          </button>

          <button
            className="test-btn clear"
            onClick={clearResults}
            disabled={isRunning}
          >
            🗑️ Clear
          </button>
        </div>

        <div className="test-results">
          <div className="results-header">
            <h4>Test Results ({testResults.length})</h4>
          </div>
          <div className="results-list">
            {testResults.length === 0 ? (
              <div className="no-results">No tests run yet</div>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className={`result-item ${result.success ? 'success' : 'error'}`}>
                  <div className="result-header">
                    <span className="result-status">
                      {result.success ? '✅' : '❌'}
                    </span>
                    <span className="result-time">{formatTime(result.timestamp)}</span>
                  </div>
                  {result.error && (
                    <div className="result-error">{result.error}</div>
                  )}
                  {result.details && (
                    <div className="result-details">
                      <pre>{JSON.stringify(result.details, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DatabaseTest