import React, { useEffect, useState } from 'react';
import API from '../api';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';

export default function StatsPage(){
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(()=> { fetchList(); }, []);

  async function fetchList(){
    try {
      const resp = await API.get('/shorturls');
      setData(resp.data.data || []);
    } catch (e){}
  }

  async function openStats(shortcode){
    try {
      const resp = await API.get('/shorturls/' + encodeURIComponent(shortcode));
      setSelected(resp.data);
    } catch (e){
      setSelected({ error: e.response?.data?.error || String(e) });
    }
  }

  return (
    <Paper sx={{ p:3 }}>
      <Typography variant="h6" gutterBottom>All Shortened URLs</Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Short Link</TableCell>
              <TableCell>Original URL</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Expiry</TableCell>
              <TableCell>Clicks</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((r) => (
              <TableRow key={r.shortcode}>
                <TableCell><a href={r.shortLink} target="_blank" rel="noreferrer">{r.shortLink}</a></TableCell>
                <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.url}</TableCell>
                <TableCell>{r.createdAt}</TableCell>
                <TableCell>{r.expiry}</TableCell>
                <TableCell>{r.totalClicks}</TableCell>
                <TableCell><Button onClick={() => openStats(r.shortcode)}>Details</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!selected} onClose={() => setSelected(null)} fullWidth maxWidth="md">
        <DialogTitle>Short URL Details</DialogTitle>
        <DialogContent>
          {selected && selected.error && <div>{selected.error}</div>}
          {selected && !selected.error && (
            <div>
              <Typography variant="subtitle1">Original URL: {selected.url}</Typography>
              <Typography variant="subtitle2">Created: {selected.createdAt} | Expiry: {selected.expiry}</Typography>
              <Typography variant="h6">Clicks</Typography>
              <List>
                {selected.clicks && selected.clicks.length>0 ? selected.clicks.map((c, idx) => (
                  <ListItem key={idx}>
                    {c.ts} — referrer: {c.referrer || 'none'} — geo: {c.geo} — ua: {c.ua || 'n/a'}
                  </ListItem>
                )) : <ListItem>No clicks yet.</ListItem>}
              </List>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Paper>
  );
}