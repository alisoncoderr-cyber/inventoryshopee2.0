// ============================================================
// components/DeviceForm.jsx
// Formulario de criacao e edicao de equipamentos
// ============================================================

import React, { useEffect, useState } from 'react';
import { createDevice, createDevicesBulk, updateDevice } from '../services/api';
import { EQUIPMENT_TYPES, SECTORS, STATUS_OPTIONS } from '../utils/constants';

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  fontSize: 14,
  color: '#111827',
  background: '#fff',
  boxSizing: 'border-box',
  outline: 'none',
  transition: 'border-color 0.15s',
  fontFamily: 'inherit',
};

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#374151',
  marginBottom: 5,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const Field = ({ label, required, children }) => (
  <div>
    <label style={labelStyle}>
      {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
    </label>
    {children}
  </div>
);

const DeviceForm = ({ device, onClose, onSuccess }) => {
  const isEditing = Boolean(device?.id);
  const isCreating = !isEditing;
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  const [formData, setFormData] = useState({
    nome_dispositivo: '',
    tipo: '',
    marca: '',
    modelo: '',
    numero_serie: '',
    setor: '',
    status: 'Ativo',
    ticket: '',
    data_aquisicao: '',
    observacoes: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [bulkSerials, setBulkSerials] = useState('');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (device) {
      setFormData({
        nome_dispositivo: device.nome_dispositivo || '',
        tipo: device.tipo || '',
        marca: device.marca || '',
        modelo: device.modelo || '',
        numero_serie: device.numero_serie || '',
        setor: device.setor || '',
        status: device.status || 'Ativo',
        ticket: device.ticket || '',
        data_aquisicao: device.data_aquisicao || '',
        observacoes: device.observacoes || '',
      });
      setBulkSerials('');
    }
  }, [device]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const getBulkSerialList = () =>
    bulkSerials
      .split(/\r?\n/)
      .map((serial) => serial.trim())
      .filter(Boolean);

  const validate = () => {
    const required = ['nome_dispositivo', 'tipo', 'marca', 'modelo', 'setor'];
    const nextErrors = {};

    required.forEach((field) => {
      if (!formData[field]?.trim()) {
        nextErrors[field] = 'Campo obrigatorio';
      }
    });

    if (!formData.numero_serie?.trim() && getBulkSerialList().length === 0) {
      nextErrors.numero_serie = 'Informe um numero de serie ou preencha a lista em lote';
    }

    return nextErrors;
  };

  const buildBulkDevices = () => {
    const serialList = getBulkSerialList();

    if (serialList.length === 0) {
      return [formData];
    }

    return serialList.map((serial) => ({
      ...formData,
      numero_serie: serial,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setApiError('');

    try {
      if (isEditing) {
        await updateDevice(device.id, formData);
      } else {
        const devicesToCreate = buildBulkDevices();

        if (devicesToCreate.length === 1) {
          await createDevice(devicesToCreate[0]);
        } else {
          await createDevicesBulk(devicesToCreate);
        }
      }

      onSuccess();
    } catch (err) {
      setApiError(err.message || 'Erro ao salvar equipamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 680,
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: isMobile ? '16px 16px 14px' : '20px 24px',
            borderBottom: '1px solid #f3f4f6',
            position: 'sticky',
            top: 0,
            background: '#fff',
            zIndex: 1,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
              {isEditing ? 'Editar Equipamento' : 'Novo Equipamento'}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>
              {isEditing ? 'Atualize os dados do equipamento.' : 'Preencha os dados para cadastrar.'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: '#f3f4f6',
              borderRadius: 8,
              width: 32,
              height: 32,
              cursor: 'pointer',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            x
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: isMobile ? 16 : 24 }}>
          {apiError && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                padding: 12,
                marginBottom: 20,
                color: '#dc2626',
                fontSize: 13,
              }}
            >
              Erro: {apiError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Nome do Dispositivo" required>
                <input
                  style={{ ...inputStyle, borderColor: errors.nome_dispositivo ? '#ef4444' : '#d1d5db' }}
                  name="nome_dispositivo"
                  value={formData.nome_dispositivo}
                  onChange={handleChange}
                  placeholder="Ex: PDA-001, Desktop-Recebimento-01"
                />
                {errors.nome_dispositivo && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.nome_dispositivo}</span>}
              </Field>
            </div>

            <Field label="Tipo de Equipamento" required>
              <select
                style={{ ...inputStyle, borderColor: errors.tipo ? '#ef4444' : '#d1d5db' }}
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
              >
                <option value="">Selecione o tipo</option>
                {EQUIPMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {errors.tipo && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.tipo}</span>}
            </Field>

            <Field label="Status">
              <select style={inputStyle} name="status" value={formData.status} onChange={handleChange}>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Marca" required>
              <input
                style={{ ...inputStyle, borderColor: errors.marca ? '#ef4444' : '#d1d5db' }}
                name="marca"
                value={formData.marca}
                onChange={handleChange}
                placeholder="Ex: Zebra, HP, Dell, Honeywell"
              />
              {errors.marca && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.marca}</span>}
            </Field>

            <Field label="Modelo" required>
              <input
                style={{ ...inputStyle, borderColor: errors.modelo ? '#ef4444' : '#d1d5db' }}
                name="modelo"
                value={formData.modelo}
                onChange={handleChange}
                placeholder="Ex: TC52, EliteBook 840"
              />
              {errors.modelo && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.modelo}</span>}
            </Field>

            <Field label="Numero de Serie" required>
              <input
                style={{ ...inputStyle, borderColor: errors.numero_serie ? '#ef4444' : '#d1d5db' }}
                name="numero_serie"
                value={formData.numero_serie}
                onChange={handleChange}
                placeholder="Ex: SN123456789"
              />
              {errors.numero_serie && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.numero_serie}</span>}
            </Field>

            <Field label="Setor" required>
              <select
                style={{ ...inputStyle, borderColor: errors.setor ? '#ef4444' : '#d1d5db' }}
                name="setor"
                value={formData.setor}
                onChange={handleChange}
              >
                <option value="">Selecione o setor</option>
                {SECTORS.map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
              {errors.setor && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.setor}</span>}
            </Field>

            <Field label="Ticket de Manutencao">
              <input
                style={inputStyle}
                name="ticket"
                value={formData.ticket}
                onChange={handleChange}
                placeholder="Ex: TKT-2024-0042"
              />
            </Field>

            <Field label="Data de Aquisicao">
              <input style={inputStyle} type="date" name="data_aquisicao" value={formData.data_aquisicao} onChange={handleChange} />
            </Field>

            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Observacoes">
                <textarea
                  style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                  name="observacoes"
                  value={formData.observacoes}
                  onChange={handleChange}
                  placeholder="Informacoes adicionais sobre o equipamento..."
                />
              </Field>
            </div>

            {isCreating && (
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Numeros de Serie em Lote">
                  <textarea
                    style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }}
                    value={bulkSerials}
                    onChange={(event) => setBulkSerials(event.target.value)}
                    placeholder={'Ex:\nSN123456\nSN123457\nSN123458'}
                  />
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
                    Cole um numero de serie por linha para cadastrar varios equipamentos de uma vez.
                  </div>
                </Field>
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'flex-end',
              flexDirection: isMobile ? 'column-reverse' : 'row',
              marginTop: 24,
              paddingTop: 20,
              borderTop: '1px solid #f3f4f6',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                background: '#fff',
                color: '#374151',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                fontFamily: 'inherit',
                width: isMobile ? '100%' : 'auto',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                background: loading ? '#9ca3af' : '#2563eb',
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: isMobile ? '100%' : 'auto',
                justifyContent: 'center',
              }}
            >
              {loading ? 'Salvando...' : isEditing ? 'Salvar Alteracoes' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeviceForm;
