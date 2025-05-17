import React, { useState } from 'react';
import { Box, Typography, Button, Paper, TextField, Alert, CircularProgress } from '@mui/material';

const MessageSeller = ({ item, seller, onClose }) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      // Simulate message sending (replace with backend integration)
      await new Promise(res => setTimeout(res, 1200));
      setSent(true);
    } catch (err) {
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 2 }}>
      <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Message Seller
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          You are contacting <b>{seller.name || 'the seller'}</b> about <b>{item.title}</b>.
        </Typography>
        {sent ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            Message sent! The seller will contact you soon.
          </Alert>
        ) : (
          <form onSubmit={handleSend}>
            <TextField
              label="Your Message"
              value={message}
              onChange={e => setMessage(e.target.value)}
              multiline
              minRows={3}
              fullWidth
              required
              sx={{ mb: 2 }}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={sending}
              sx={{ py: 1.2, fontWeight: 600 }}
            >
              {sending ? <CircularProgress size={22} /> : 'Send Message'}
            </Button>
            <Button onClick={onClose} color="secondary" fullWidth sx={{ mt: 1 }}>
              Cancel
            </Button>
          </form>
        )}
      </Paper>
    </Box>
  );
};

export default MessageSeller;
