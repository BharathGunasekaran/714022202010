import React, { useState } from 'react';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import API from '../api';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';

function makeEmptyRow(){ return { url: '', validity: 30, shortcode: '' }; }

export default function ShortenerPage(){
  const [rows, setRows] = useState([makeEmptyRow()]);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function addRow(){
    if (rows.length >= 5) return;
    setRows(prev => [...prev, makeEmptyRow()]);
  }
  function removeRow(i){
    setRows(prev => prev.filter((_, idx) => idx !== i));
  }
  function updateRow(i, field, value){
    setRows(prev => prev.map((r, idx) => idx===i ? { ...r, [field]: value } : r));
  }

  async function submitAll(){
    setError(null);
    setLoading(true);
    try {
      // client-side validation
      for (let r of rows){
        if (!r.url || !/^https?:\/\/.+/.test(r.url)) throw new Error('Enter valid absolute URLs (http/https).');
        if (r.validity && (!Number.isInteger(Number(r.validity)) || Number(r.validity) <= 0)) throw new Error('Validity must be a positive integer (minutes).');
      }
      const promises = rows.map(r => API.post('/shorturls', { url: r.url, validity: Number(r.validity), shortcode: r.shortcode || undefined }));
      const responses = await Promise.all(promises);
      const data = responses.map(resp => resp.data);
      setResults(data);
    } catch (e){
      setError(e.response?.data?.error || e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Paper sx={{ p:3 }}>
      <Typography variant="h6" gutterBottom>Shorten up to 5 URLs</Typography>
      <Stack spacing={2}>
        {rows.map((r, i) => (
          <Grid container spacing={2} key={i} alignItems="center">
            <Grid item xs={12} md={6}><TextField fullWidth label="Original URL" value={r.url} onChange={e => updateRow(i, 'url', e.target.value)} /></Grid>
            <Grid item xs={6} md={3}><TextField fullWidth label="Validity (minutes)" type="number" value={r.validity} onChange={e => updateRow(i, 'validity', e.target.value)} /></Grid>
            <Grid item xs={6} md={2}><TextField fullWidth label="Preferred shortcode (optional)" value={r.shortcode} onChange={e => updateRow(i, 'shortcode', e.target.value)} /></Grid>
            <Grid item xs={12} md={1}><Button variant="outlined" color="error" onClick={() => removeRow(i)} disabled={rows.length===1}>X</Button></Grid>
          </Grid>
        ))}

        <Grid container spacing={2}>
          <Grid item>
            <Button variant="contained" onClick={addRow} disabled={rows.length>=5}>Add row</Button>
          </Grid>
          <Grid item>
            <Button variant="contained" onClick={submitAll} disabled={loading}>Create Short URLs</Button>
          </Grid>
        </Grid>

        {error && <Alert severity="error">{error}</Alert>}

        {results.length > 0 && (
          <div>
            <Typography variant="h6">Results</Typography>
            <ul>
              {results.map((r, idx) => (
                <li key={idx}><a href={r.shortLink} target="_blank" rel="noreferrer">{r.shortLink}</a> — Expires at: {r.expiry}</li>
              ))}
            </ul>
          </div>
        )}
      </Stack>
    </Paper>
  );
}