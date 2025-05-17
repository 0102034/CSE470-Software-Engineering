import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Card,
    CardContent,
    Grid,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button
} from '@mui/material';
import {
    Delete as DeleteIcon,
    Visibility as ViewIcon,
    Block as BlockIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../../styles/RideShare.css';

const RideManagement = () => {
    const [rides, setRides] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        cancelled: 0,
        completed: 0
    });
    const [deleteConfirmation, setDeleteConfirmation] = useState(null);
    const [selectedRide, setSelectedRide] = useState(null);

    useEffect(() => {
        fetchRides();
    }, []);

    const fetchRides = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/admin/rides');
            setRides(response.data.rides);
            setStats(response.data.stats);
        } catch (error) {
            console.error('Error fetching rides:', error);
            toast.error('Failed to fetch rides');
        }
    };

    const handleDeleteRide = async () => {
        if (!deleteConfirmation) return;

        try {
            await axios.delete(`http://localhost:5000/api/admin/rides/${deleteConfirmation}`);
            toast.success('Ride deleted successfully');
            setDeleteConfirmation(null);
            fetchRides();
        } catch (error) {
            console.error('Error deleting ride:', error);
            toast.error('Failed to delete ride');
        }
    };

    const handleBlockRide = async (rideId) => {
        try {
            await axios.post(`http://localhost:5000/api/admin/rides/${rideId}/block`);
            toast.success('Ride blocked successfully');
            fetchRides();
        } catch (error) {
            console.error('Error blocking ride:', error);
            toast.error('Failed to block ride');
        }
    };

    return (
        <div className="admin-rides">
            <div className="admin-rides__header">
                <Typography variant="h4">Ride Management</Typography>
            </div>

            <div className="admin-rides__stats">
                <Card className="admin-rides__stat-card">
                    <CardContent>
                        <Typography color="textSecondary" gutterBottom>
                            Total Rides
                        </Typography>
                        <Typography variant="h4">{stats.total}</Typography>
                    </CardContent>
                </Card>
                <Card className="admin-rides__stat-card">
                    <CardContent>
                        <Typography color="textSecondary" gutterBottom>
                            Active Rides
                        </Typography>
                        <Typography variant="h4" style={{ color: '#1976d2' }}>
                            {stats.active}
                        </Typography>
                    </CardContent>
                </Card>
                <Card className="admin-rides__stat-card">
                    <CardContent>
                        <Typography color="textSecondary" gutterBottom>
                            Cancelled Rides
                        </Typography>
                        <Typography variant="h4" style={{ color: '#d32f2f' }}>
                            {stats.cancelled}
                        </Typography>
                    </CardContent>
                </Card>
                <Card className="admin-rides__stat-card">
                    <CardContent>
                        <Typography color="textSecondary" gutterBottom>
                            Completed Rides
                        </Typography>
                        <Typography variant="h4" style={{ color: '#2e7d32' }}>
                            {stats.completed}
                        </Typography>
                    </CardContent>
                </Card>
            </div>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>From → To</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Creator</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Bookings</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rides.map((ride) => (
                            <TableRow key={ride._id}>
                                <TableCell>
                                    {ride.from_location} → {ride.to_location}
                                </TableCell>
                                <TableCell>
                                    {format(new Date(ride.date), 'PPP')}
                                </TableCell>
                                <TableCell>
                                    {ride.creator.name}
                                    <br />
                                    <Typography variant="caption" color="textSecondary">
                                        {ride.creator.email}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <div className={`ride-status ride-status--${ride.status.toLowerCase()}`}>
                                        {ride.status}
                                    </div>
                                </TableCell>
                                <TableCell>{ride.bookings.length}</TableCell>
                                <TableCell>
                                    <Tooltip title="View Details">
                                        <IconButton
                                            color="primary"
                                            onClick={() => setSelectedRide(ride)}
                                        >
                                            <ViewIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Block Ride">
                                        <IconButton
                                            color="warning"
                                            onClick={() => handleBlockRide(ride._id)}
                                        >
                                            <BlockIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete Ride">
                                        <IconButton
                                            color="error"
                                            onClick={() => setDeleteConfirmation(ride._id)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
            >
                <DialogTitle>Delete Ride</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete this ride? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmation(null)}>Cancel</Button>
                    <Button onClick={handleDeleteRide} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Ride Details Dialog */}
            <Dialog
                open={!!selectedRide}
                onClose={() => setSelectedRide(null)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Ride Details</DialogTitle>
                <DialogContent>
                    {selectedRide && (
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2">Route</Typography>
                                <Typography gutterBottom>
                                    {selectedRide.from_location} → {selectedRide.to_location}
                                </Typography>

                                <Typography variant="subtitle2">Date</Typography>
                                <Typography gutterBottom>
                                    {format(new Date(selectedRide.date), 'PPP')}
                                </Typography>

                                <Typography variant="subtitle2">Creator</Typography>
                                <Typography gutterBottom>
                                    {selectedRide.creator.name} ({selectedRide.creator.email})
                                </Typography>

                                <Typography variant="subtitle2">Contact</Typography>
                                <Typography gutterBottom>
                                    {selectedRide.contact_number}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2">Payment</Typography>
                                <Typography gutterBottom>
                                    {selectedRide.is_paid
                                        ? `${selectedRide.fee} BDT (${selectedRide.payment_method})`
                                        : 'Free ride'}
                                </Typography>

                                <Typography variant="subtitle2">Status</Typography>
                                <Typography gutterBottom>
                                    <span className={`ride-status ride-status--${selectedRide.status.toLowerCase()}`}>
                                        {selectedRide.status}
                                    </span>
                                </Typography>

                                <Typography variant="subtitle2">Created At</Typography>
                                <Typography gutterBottom>
                                    {format(new Date(selectedRide.created_at), 'PPP pp')}
                                </Typography>
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSelectedRide(null)}>Close</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default RideManagement;
