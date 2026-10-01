import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Select, Stack, TextField, Typography } from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import SearchIcon from '@mui/icons-material/Search';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { getAuth } from 'firebase/auth';
import UserService from '../../../Firebase/userService';
import TenantService from '../../../Firebase/tenantService';
import { useSnackbar } from '../../Components/snackbar/AtlasSnackbar';
import { getCurrentGymId, setCurrentGymId } from '../../../Firebase/tenant';
import { provisionExistingMemberAccounts } from '../../../Firebase/memberAuthService';

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return 'No registrado';
  if (typeof value?.toDate === 'function') return value.toDate().toLocaleDateString('es-ES');
  if (value instanceof Date) return value.toLocaleDateString('es-ES');
  return String(value);
};

const requesterFields = ['name', 'dni', 'email', 'phone', 'birthday', 'until', 'uid'];

function SuperAdmin({ menu }) {
  const [tenants, setTenants] = useState([]);
  const [requests, setRequests] = useState([]);
  const [membershipRequests, setMembershipRequests] = useState([]);
  const [transferRequests, setTransferRequests] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [userAssignments, setUserAssignments] = useState({});
  const [userSearch, setUserSearch] = useState('');
  const [editingTenant, setEditingTenant] = useState(null);
  const [tenantName, setTenantName] = useState('');
  const [deleteTenantTarget, setDeleteTenantTarget] = useState(null);
  const [activeGymId, setActiveGymId] = useState('');
  const [provisioningAccounts, setProvisioningAccounts] = useState(false);
  const { showSnackbar } = useSnackbar();

  const refresh = async () => {
    const [tenantData, requestData, membershipData, transferData] = await Promise.all([
      TenantService.getAll(true),
      TenantService.getRequests(),
      TenantService.getMembershipRequests(true),
      TenantService.getTransferRequests(true),
    ]);
    setTenants(tenantData);
    const uid = getAuth().currentUser?.uid;
    const storedGymId = uid ? localStorage.getItem(`ACTIVE_GYM_ID:${uid}`) : null;
    const currentGymId = storedGymId || await getCurrentGymId().catch(() => null);
    setActiveGymId((selectedGymId) => {
      if (selectedGymId && tenantData.some((tenant) => tenant.id === selectedGymId)) {
        return selectedGymId;
      }

      if (currentGymId && tenantData.some((tenant) => tenant.id === currentGymId)) {
        return currentGymId;
      }

      return tenantData[0]?.id || '';
    });
    setRequests(requestData);
    const enrichedMembershipRequests = await Promise.all(membershipData.map(async (request) => {
      if (request.requester?.name || !request.requestedBy) return request;
      const requester = await UserService.get(request.requestedBy);
      return { ...request, requester: requester || {} };
    }));
    setMembershipRequests(enrichedMembershipRequests);
    setTransferRequests(transferData);
    const allUsers = await UserService.getAllUsers();
    setAdmins(allUsers);
    setUserAssignments(Object.fromEntries(allUsers.map((user) => [
      user.uid,
      { gymId: user.gymId || '', role: user.rol ?? 1 },
    ])));
  };

  const approveMembership = async (request) => {
    try {
      await TenantService.approveMembershipRequest(request.id, request);
      await refresh();
      showSnackbar('Solicitud de membresía aprobada.', 'success');
    } catch {
      showSnackbar('No se pudo aprobar la solicitud de membresía.', 'error');
    }
  };

  const rejectMembership = async (request) => {
    try {
      await TenantService.rejectMembershipRequest(request.id);
      await refresh();
      showSnackbar('Solicitud de membresía rechazada.', 'success');
    } catch {
      showSnackbar('No se pudo rechazar la solicitud de membresía.', 'error');
    }
  };

  const approveTransfer = async (request) => {
    try {
      await TenantService.approveTransferRequest(request.id, request);
      await refresh();
      showSnackbar('Traslado aprobado.', 'success');
    } catch {
      showSnackbar('No se pudo aprobar el traslado.', 'error');
    }
  };

  const rejectTransfer = async (request) => {
    try {
      await TenantService.rejectTransferRequest(request.id);
      await refresh();
      showSnackbar('Solicitud de traslado rechazada.', 'success');
    } catch {
      showSnackbar('No se pudo rechazar el traslado.', 'error');
    }
  };

  useEffect(() => {
    refresh().catch(() => showSnackbar('No se pudo cargar la administración.', 'error'));
  }, []);

  const approve = async (request) => {
    const requestedGymId = request.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    try {
      await TenantService.createGym(request.id, request, requestedGymId);
      await refresh();
      showSnackbar('Gimnasio aprobado.', 'success');
    } catch {
      showSnackbar('No se pudo aprobar el gimnasio.', 'error');
    }
  };

  const rejectGym = async (request) => {
    try {
      await TenantService.rejectRequest(request.id, 'gym');
      await refresh();
      showSnackbar('Solicitud de gimnasio rechazada.', 'success');
    } catch {
      showSnackbar('No se pudo rechazar la solicitud.', 'error');
    }
  };

  const updateUser = async (uid) => {
    const assignment = userAssignments[uid];
    try {
      await TenantService.updateUserAssignment(uid, assignment.gymId, Number(assignment.role));
      await refresh();
      showSnackbar('Asignación actualizada.', 'success');
    } catch {
      showSnackbar('No se pudo actualizar la asignación.', 'error');
    }
  };

  const deleteUser = async (account) => {
    if (!window.confirm(`¿Eliminar a ${account.name || account.email || account.uid}?`)) return;
    try {
      await UserService.delete(account.uid);
      await refresh();
      showSnackbar('Usuario eliminado.', 'success');
    } catch {
      showSnackbar('No se pudo eliminar el usuario.', 'error');
    }
  };

  const updateAssignmentField = (uid, field, value) => {
    setUserAssignments((current) => ({
      ...current,
      [uid]: { ...current[uid], [field]: value },
    }));
  };

  const downloadCredentialsReport = (created, skipped) => {
    const rows = [
      ['estado', 'uid', 'correo', 'contraseña_temporal', 'detalle'],
      ...created.map((account) => ['creada', account.uid, account.email, account.temporaryPassword, '']),
      ...skipped.map((account) => ['omitida', account.uid, account.email, '', account.reason]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cuentas-miembros.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleProvisionAccounts = async () => {
    if (!window.confirm('Se crearán cuentas con contraseñas temporales únicas para los perfiles elegibles. El reporte se descargará una sola vez. ¿Continuar?')) return;
    try {
      setProvisioningAccounts(true);
      const result = await provisionExistingMemberAccounts();
      downloadCredentialsReport(result.created || [], result.skipped || []);
      showSnackbar(`${result.created?.length || 0} cuentas creadas. Se descargó el reporte.`, 'success');
    } catch (error) {
      showSnackbar(error.message || 'No se pudieron crear las cuentas.', 'error');
    } finally {
      setProvisioningAccounts(false);
    }
  };

  const saveTenant = async () => {
    try {
      await TenantService.updateTenant(editingTenant.id, { name: tenantName, status: editingTenant.status });
      setEditingTenant(null);
      await refresh();
      showSnackbar('Gimnasio actualizado.', 'success');
    } catch {
      showSnackbar('No se pudo actualizar el gimnasio.', 'error');
    }
  };

  const deleteTenant = async () => {
    try {
      await TenantService.deleteTenant(deleteTenantTarget.id);
      setDeleteTenantTarget(null);
      await refresh();
      showSnackbar('Gimnasio eliminado junto con sus datos.', 'success');
    } catch (error) {
      showSnackbar(error.message === 'Cannot delete a gym with assigned members'
        ? 'No se puede eliminar un gimnasio con miembros asignados.'
        : 'No se pudo eliminar el gimnasio.', 'error');
    }
  };

  const deferredUserSearch = useDeferredValue(userSearch);
  const normalizedSearch = deferredUserSearch.trim().toLowerCase();
  const tenantNamesById = useMemo(
    () => new Map(tenants.map((tenant) => [tenant.id, tenant.name])),
    [tenants],
  );
  const matchingUsers = useMemo(() => {
    if (!normalizedSearch) return [];

    const matchingGymIds = new Set(
      tenants
        .filter((tenant) => [tenant.name, tenant.id]
          .some((value) => String(value || '').toLowerCase().includes(normalizedSearch)))
        .map((tenant) => tenant.id),
    );

    return admins.filter((account) => [
      account.name,
      account.email,
      account.dni,
      account.phone,
      account.uid,
    ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch))
      || matchingGymIds.has(account.gymId));
  }, [admins, normalizedSearch, tenants]);

  return (
    <>
      {menu}
      <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
        <Card sx={{ mb: 3, borderRadius: 3, background: 'linear-gradient(135deg, #1b2730 0%, #294653 100%)', color: 'common.white', boxShadow: 3 }}>
          <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <BusinessIcon sx={{ fontSize: 42, color: '#f4a949' }} />
                <Box>
                  <Typography variant="h4" fontWeight={700}>Administración global</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,.72)', mt: .5 }}>Gestiona gimnasios, usuarios y solicitudes desde un solo lugar.</Typography>
                </Box>
              </Box>
              <Stack spacing={.5} sx={{ minWidth: { xs: '100%', md: 280 } }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,.72)' }}>Gimnasio activo para administrar</Typography>
                <Select
                  size="small"
                  value={activeGymId}
                  onChange={(event) => {
            setActiveGymId(event.target.value);
            setCurrentGymId(event.target.value);
            window.location.reload();
                  }}
                  sx={{ color: 'common.white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.5)' }, '& .MuiSvgIcon-root': { color: 'common.white' } }}
                >
            {tenants.map((tenant) => <MenuItem key={tenant.id} value={tenant.id}>{tenant.name}</MenuItem>)}
                </Select>
                <Button variant="outlined" color="inherit" onClick={handleProvisionAccounts} disabled={true} sx={{ mt: 1 }}>
                  {provisioningAccounts ? 'Creando cuentas...' : 'Crear cuentas para miembros existentes'}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 3, mb: 3, boxShadow: 2 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="h6" fontWeight={700}>Gimnasios</Typography>
              <Chip label={`${tenants.length} registrados`} size="small" color="primary" variant="outlined" />
            </Stack>
            <Stack spacing={1.5}>
          {tenants.map((tenant) => (
            <Paper key={tenant.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography fontWeight={600}>{tenant.name}</Typography>
                <Typography variant="caption" color="text.secondary">{tenant.id}</Typography>
              </Box>
              <Button variant="outlined" onClick={() => { setEditingTenant(tenant); setTenantName(tenant.name); }}>Editar</Button>
              <Button color="error" variant="outlined" onClick={() => setDeleteTenantTarget(tenant)}>Eliminar</Button>
              </Stack>
            </Paper>
          ))}
            </Stack>
          </CardContent>
        </Card>
        {requests.length > 0 && <Card sx={{ borderRadius: 3, mb: 3, boxShadow: 2 }}><CardContent><Typography variant="h6" fontWeight={700}>Solicitudes de gimnasios</Typography><Stack spacing={1.5} sx={{ mt: 2 }}>
          {requests.map((request) => (
            <Paper key={request.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <Box sx={{ flexGrow: 1 }}><Typography fontWeight={600}>{request.name}</Typography><Typography variant="body2" color="text.secondary">{request.requestedByEmail}</Typography></Box>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" onClick={() => approve(request)}>Aprobar</Button>
                <Button color="error" variant="outlined" onClick={() => rejectGym(request)}>Rechazar</Button>
              </Stack>
            </Stack>
            </Paper>
          ))}
        </Stack></CardContent></Card>}
        {membershipRequests.length > 0 && <Card sx={{ borderRadius: 3, mb: 3, boxShadow: 2 }}><CardContent><Typography variant="h6" fontWeight={700}>Solicitudes para unirse a un gimnasio</Typography><Stack spacing={1.5} sx={{ mt: 2 }}>
          {membershipRequests.map((request) => (
            <Paper key={request.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Stack spacing={1}>
              <Typography variant="subtitle1">
                Solicitud de {formatValue(request.requester?.name)} → {request.gymId}
              </Typography>
              {requesterFields.map((field) => (
                <Typography key={field} variant="body2">
                  <strong>{field}:</strong> {formatValue(request.requester?.[field] || (field === 'email' ? request.requestedByEmail : null))}
                </Typography>
              ))}
              <Typography variant="body2"><strong>Detalles:</strong> {formatValue(request.details)}</Typography>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" onClick={() => approveMembership(request)}>Aprobar</Button>
                <Button color="error" variant="outlined" onClick={() => rejectMembership(request)}>Rechazar</Button>
              </Stack>
            </Stack>
            </Paper>
          ))}
        </Stack></CardContent></Card>}
        {transferRequests.length > 0 && <Card sx={{ borderRadius: 3, mb: 3, boxShadow: 2 }}><CardContent><Typography variant="h6" fontWeight={700}>Solicitudes de traslado</Typography><Stack spacing={1.5} sx={{ mt: 2 }}>
          {transferRequests.map((request) => (
            <Paper key={request.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Stack spacing={1}>
              <Typography>{request.requester?.name || request.requestedByEmail} → {request.gymId}</Typography>
              <Typography variant="body2">Gimnasio actual: {request.currentGymId}</Typography>
              <Typography variant="body2">Detalles: {request.details || 'No registrados'}</Typography>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" onClick={() => approveTransfer(request)}>Aprobar</Button>
                <Button color="error" variant="outlined" onClick={() => rejectTransfer(request)}>Rechazar</Button>
              </Stack>
            </Stack>
            </Paper>
          ))}
        </Stack></CardContent></Card>}
        {admins.length > 0 && <Card sx={{ borderRadius: 3, boxShadow: 2 }}><CardContent><Stack direction="row" spacing={1} alignItems="center"><SearchIcon color="primary" /><Typography variant="h6" fontWeight={700}>Buscar usuarios</Typography></Stack>
          <TextField
            fullWidth
            size="small"
            label="Nombre, correo, cédula, teléfono o UID"
            placeholder="También puedes escribir el nombre de un gimnasio"
            InputProps={{ startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} /> }}
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
            sx={{ mt: 1, mb: 2 }}
          />
          {matchingUsers.length > 0 && <Typography variant="subtitle1" sx={{ mb: 1 }}>Resultados encontrados</Typography>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            {matchingUsers.map((account) => (
              <Paper key={account.uid} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack spacing={1}>
                <Typography variant="subtitle1">{account.name || 'Sin nombre'}</Typography>
                <Typography variant="body2">Correo: {account.email || 'No registrado'}</Typography>
                <Typography variant="body2">Cédula: {account.dni || 'No registrada'}</Typography>
                <Typography variant="body2">Teléfono: {account.phone || 'No registrado'}</Typography>
                <Typography variant="body2">UID: {account.uid}</Typography>
                <Typography variant="body2">Gimnasio: {tenantNamesById.get(account.gymId) || account.gymId || 'Sin gimnasio'}</Typography>
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <Select size="small" value={userAssignments[account.uid]?.role ?? 1} onChange={(event) => updateAssignmentField(account.uid, 'role', event.target.value)}>
                  <MenuItem value={0}>Admin</MenuItem>
                  <MenuItem value={1}>Miembro</MenuItem>
                  <MenuItem value={2}>Super admin</MenuItem>
                </Select>
                <Select size="small" value={userAssignments[account.uid]?.gymId ?? ''} onChange={(event) => updateAssignmentField(account.uid, 'gymId', event.target.value)} displayEmpty>
                  <MenuItem value="">Sin gimnasio</MenuItem>
                  {tenants.map((tenant) => <MenuItem key={tenant.id} value={tenant.id}>{tenant.name}</MenuItem>)}
                </Select>
                <Button variant="outlined" onClick={() => updateUser(account.uid)}>Guardar</Button>
                <Button color="error" variant="outlined" onClick={() => deleteUser(account)}>Eliminar usuario</Button>
                </Stack>
              </Stack>
              </Paper>
            ))}
            {normalizedSearch && !matchingUsers.length && (
              <Typography color="text.secondary">No se encontraron usuarios.</Typography>
            )}
          </Stack>
        </CardContent></Card>}
      </Container>
      <Dialog open={Boolean(editingTenant)} onClose={() => setEditingTenant(null)} fullWidth maxWidth="sm">
        <DialogTitle>Editar gimnasio</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Nombre" value={tenantName} onChange={(event) => setTenantName(event.target.value)} sx={{ mt: 1 }} />
          <Select fullWidth value={editingTenant?.status || 'active'} onChange={(event) => setEditingTenant({ ...editingTenant, status: event.target.value })} sx={{ mt: 2 }}>
            <MenuItem value="active">Activo</MenuItem>
            <MenuItem value="inactive">Inactivo</MenuItem>
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingTenant(null)}>Cancelar</Button>
          <Button variant="contained" onClick={saveTenant}>Guardar</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(deleteTenantTarget)} onClose={() => setDeleteTenantTarget(null)}>
        <DialogTitle>Eliminar gimnasio</DialogTitle>
        <DialogContent>
          <Typography>Se eliminarán también sus planeamientos, circuitos, finanzas y demás datos asociados. Solo es posible si no tiene miembros asignados.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTenantTarget(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={deleteTenant}>Eliminar definitivamente</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default SuperAdmin;
