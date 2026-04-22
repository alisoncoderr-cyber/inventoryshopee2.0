// ============================================================
// components/DeviceForm.jsx
// Formulario de criacao e edicao de equipamentos
// ============================================================

import React, { useEffect, useState } from 'react';
import { createDevice, createDevicesBulk, updateDevice } from '../services/api';
import { invalidateInventoryCache } from '../services/inventoryCache';
import { EQUIPMENT_TYPES, SECTORS, STATUS_OPTIONS } from '../utils/constants';

const inputStyle = {
  width: '100%',
  padding: '11px 13px',
  border: '1px solid rgba(148,163,184,0.24)',
  borderRadius: 12,
  fontSize: 14,
  color: 'var(--text-primary)',
  background: 'rgba(255,255,255,0.94)',
  boxSizing: 'border-box',
  outline: 'none',
  transition: 'border-color 0.15s',
  fontFamily: 'inherit',
};

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--text-secondary)',
  marginBottom: 6,
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
    pessoa_atribuida: '',
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
        nome_dispositivo: device.nome_dispositivo || device.tipo || '',
        tipo: device.tipo || '',
        marca: device.marca || '',
        modelo: device.modelo || '',
        numero_serie: device.numero_serie || '',
        setor: device.setor || '',
        pessoa_atribuida: device.pessoa_atribuida || '',
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
    setFormData((prev) => {
      if (name === 'tipo') {
        return {
          ...prev,
          [name]: value,
          nome_dispositivo: value,
          pessoa_atribuida: value === 'Laptop' ? prev.pessoa_atribuida : '',
        };
      }

      return { ...prev, [name]: value };
    });
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const getBulkSerialList = () =>
    bulkSerials
      .split(/\r?\n/)
      .map((serial) => serial.trim())
      .filter(Boolean);

  const validate = () => {
    const required = ['tipo', 'marca', 'modelo', 'setor'];
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
    const normalizedFormData = {
      ...formData,
      nome_dispositivo: formData.tipo,
    };

    if (serialList.length === 0) {
      return [normalizedFormData];
    }

    return serialList.map((serial) => ({
      ...normalizedFormData,
      numero_serie: serial,
    }));
  };

  const showAssignedPersonField = formData.tipo === 'Laptop';

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
        await updateDevice(device.id, {
          ...formData,
          nome_dispositivo: formData.tipo,
        });
      } else {
        const devicesToCreate = buildBulkDevices();

        if (devicesToCreate.length === 1) {
          await createDevice(devicesToCreate[0]);
        } else {
          await createDevicesBulk(devicesToCreate);
        }
      }

      invalidateInventoryCache();
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
        background: 'rgba(15,23,42,0.36)',
        backdropFilter: 'blur(8px)',
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
          background: '#ffffff',
          borderRadius: 24,
          width: '100%',
          maxWidth: 700,
          maxHeight: '90vh',
          overflow: 'auto',
          border: '1px solid rgba(148,163,184,0.18)',
          boxShadow: '0 30px 80px rgba(15,23,42,0.18)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: isMobile ? '18px 18px 14px' : '22px 26px',
            borderBottom: '1px solid rgba(148,163,184,0.14)',
            position: 'sticky',
            top: 0,
            background: 'rgba(255,255,255,0.94)',
            backdropFilter: 'blur(10px)',
            zIndex: 1,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
              {isEditing ? 'Editar Equipamento' : 'Novo Equipamento'}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              {isEditing ? 'Atualize os dados do equipamento.' : 'Preencha os dados para cadastrar.'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              border: '1px solid rgba(148,163,184,0.18)',
              background: '#f8fafc',
              color: 'var(--text-secondary)',
              borderRadius: 12,
              width: 36,
              height: 36,
              cursor: 'pointer',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: isMobile ? 18 : 26 }}>
          {apiError && (
            <div
              style={{
                background: 'var(--danger-soft)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 12,
                padding: 12,
                marginBottom: 20,
                color: '#b91c1c',
                fontSize: 13,
              }}
            >
              Erro: {apiError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
            <Field label="Tipo de Equipamento" required>
              <select
                style={{ ...inputStyle, borderColor: errors.tipo ? '#ef4444' : 'rgba(148,163,184,0.24)' }}
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
              {errors.tipo && <span style={{ fontSize: 11, color: '#b91c1c' }}>{errors.tipo}</span>}
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
                style={{ ...inputStyle, borderColor: errors.marca ? '#ef4444' : 'rgba(148,163,184,0.24)' }}
                name="marca"
                value={formData.marca}
                onChange={handleChange}
                placeholder="Ex: Zebra, HP, Dell, Honeywell"
              />
              {errors.marca && <span style={{ fontSize: 11, color: '#b91c1c' }}>{errors.marca}</span>}
            </Field>

            <Field label="Modelo" required>
              <input
                style={{ ...inputStyle, borderColor: errors.modelo ? '#ef4444' : 'rgba(148,163,184,0.24)' }}
                name="modelo"
                value={formData.modelo}
                onChange={handleChange}
                placeholder="Ex: TC52, EliteBook 840"
              />
              {errors.modelo && <span style={{ fontSize: 11, color: '#b91c1c' }}>{errors.modelo}</span>}
            </Field>

            <Field label="Numero de Serie" required>
              <input
                style={{ ...inputStyle, borderColor: errors.numero_serie ? '#ef4444' : 'rgba(148,163,184,0.24)' }}
                name="numero_serie"
                value={formData.numero_serie}
                onChange={handleChange}
                placeholder="Ex: SN123456789"
              />
              {errors.numero_serie && <span style={{ fontSize: 11, color: '#b91c1c' }}>{errors.numero_serie}</span>}
            </Field>

            <Field label="Setor" required>
              <select
                style={{ ...inputStyle, borderColor: errors.setor ? '#ef4444' : 'rgba(148,163,184,0.24)' }}
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
              {errors.setor && <span style={{ fontSize: 11, color: '#b91c1c' }}>{errors.setor}</span>}
            </Field>

            {showAssignedPersonField && (
              <Field label="Pessoa Atribuida">
                <input
                  style={inputStyle}
                  name="pessoa_atribuida"
                  value={formData.pessoa_atribuida}
                  onChange={handleChange}
                  placeholder="Ex: Joao Silva"
                />
              </Field>
            )}

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
                  style={{ ...inputStyle, minHeight: 84, resize: 'vertical' }}
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
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                    Cole um numero de serie por linha para cadastrar varios equipamentos de uma vez em uma unica operacao.
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
              borderTop: '1px solid rgba(148,163,184,0.14)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '11px 20px',
                borderRadius: 12,
                border: '1px solid rgba(148,163,184,0.22)',
                background: '#ffffff',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
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
                padding: '11px 24px',
                borderRadius: 12,
                border: 'none',
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
                color: '#ffffff',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 700,
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: isMobile ? '100%' : 'auto',
                justifyContent: 'center',
                boxShadow: loading ? 'none' : '0 14px 28px rgba(29,78,216,0.16)',
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
