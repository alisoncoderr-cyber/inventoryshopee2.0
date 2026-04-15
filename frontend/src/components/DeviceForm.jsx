// ============================================================
// components/DeviceForm.jsx
// Formulário de criação e edição de equipamentos
// ============================================================

import React, { useState, useEffect } from 'react';
import { createDevice, createDevicesBulk, updateDevice } from '../services/api';
import { EQUIPMENT_TYPES, STATUS_OPTIONS, SECTORS } from '../utils/constants';

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

  // Preenche o formulário em modo edição
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const getBulkSerialList = () => {
    return bulkSerials
      .split(/\r?\n/)
      .map((serial) => serial.trim())
      .filter(Boolean);
  };

  const validate = () => {
    const required = ['nome_dispositivo', 'tipo', 'marca', 'modelo', 'setor'];
    const newErrors = {};
    required.forEach((field) => {
      if (!formData[field]?.trim()) {
        newErrors[field] = 'Campo obrigatório';
      }
    });
    if (!formData.numero_serie?.trim() && getBulkSerialList().length === 0) {
      newErrors.numero_serie = 'Informe um nÃºmero de sÃ©rie ou preencha a lista em lote';
    }

    return newErrors;
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

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    // Overlay
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16
    }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Modal */}
      <div style={{
        background: '#fff', borderRadius: 14, width: '100%', maxWidth: 680,
        maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid #f3f4f6',
          position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
              {isEditing ? '✏️ Editar Equipamento' : '➕ Novo Equipamento'}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>
              {isEditing ? 'Atualize os dados do equipamento' : 'Preencha os dados para cadastrar'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none', background: '#f3f4f6', borderRadius: 8,
              width: 32, height: 32, cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          {apiError && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
              padding: 12, marginBottom: 20, color: '#dc2626', fontSize: 13
            }}>
              ❌ {apiError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Nome do Dispositivo */}
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Nome do Dispositivo" required>
                <input
                  style={{ ...inputStyle, borderColor: errors.nome_dispositivo ? '#ef4444' : '#d1d5db' }}
                  name="nome_dispositivo"
                  value={formData.nome_dispositivo}
                  onChange={handleChange}
                  placeholder="Ex: PDA-001, Desktop-Recebimento-01"
                />
                {errors.nome_dispositivo && (
                  <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.nome_dispositivo}</span>
                )}
              </Field>
            </div>

            {/* Tipo */}
            <Field label="Tipo de Equipamento" required>
              <select
                style={{ ...inputStyle, borderColor: errors.tipo ? '#ef4444' : '#d1d5db' }}
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
              >
                <option value="">Selecione o tipo</option>
                {EQUIPMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {errors.tipo && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.tipo}</span>}
            </Field>

            {/* Status */}
            <Field label="Status">
              <select
                style={inputStyle}
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>

            {/* Marca */}
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

            {/* Modelo */}
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

            {/* Número de Série */}
            <Field label="Número de Série" required>
              <input
                style={{ ...inputStyle, borderColor: errors.numero_serie ? '#ef4444' : '#d1d5db' }}
                name="numero_serie"
                value={formData.numero_serie}
                onChange={handleChange}
                placeholder="Ex: SN123456789"
              />
              {errors.numero_serie && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.numero_serie}</span>}
            </Field>

            {/* Setor */}
            <Field label="Setor" required>
              <select
                style={{ ...inputStyle, borderColor: errors.setor ? '#ef4444' : '#d1d5db' }}
                name="setor"
                value={formData.setor}
                onChange={handleChange}
              >
                <option value="">Selecione o setor</option>
                {SECTORS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {errors.setor && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.setor}</span>}
            </Field>

            {/* Ticket de Manutenção */}
            <Field label="Ticket de Manutenção">
              <input
                style={inputStyle}
                name="ticket"
                value={formData.ticket}
                onChange={handleChange}
                placeholder="Ex: TKT-2024-0042"
              />
            </Field>

            {/* Data de Aquisição */}
            <Field label="Data de Aquisição">
              <input
                style={inputStyle}
                type="date"
                name="data_aquisicao"
                value={formData.data_aquisicao}
                onChange={handleChange}
              />
            </Field>

            {/* Observações */}
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Observações">
                <textarea
                  style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                  name="observacoes"
                  value={formData.observacoes}
                  onChange={handleChange}
                  placeholder="Informações adicionais sobre o equipamento..."
                />
              </Field>
            </div>

            {isCreating && (
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="NÃºmeros de SÃ©rie em Lote">
                  <textarea
                    style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }}
                    value={bulkSerials}
                    onChange={(e) => setBulkSerials(e.target.value)}
                    placeholder={'Ex:\nSN123456\nSN123457\nSN123458'}
                  />
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
                    Cole um nÃºmero de sÃ©rie por linha para cadastrar vÃ¡rios equipamentos de uma vez. Se deixar vazio, o sistema usarÃ¡ o campo de nÃºmero de sÃ©rie individual.
                  </div>
                </Field>
              </div>
            )}
          </div>

          {/* Botões */}
          <div style={{
            display: 'flex', gap: 12, justifyContent: 'flex-end',
            marginTop: 24, paddingTop: 20, borderTop: '1px solid #f3f4f6'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px', borderRadius: 8, border: '1px solid #d1d5db',
                background: '#fff', color: '#374151', cursor: 'pointer',
                fontSize: 14, fontWeight: 500, fontFamily: 'inherit',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 24px', borderRadius: 8, border: 'none',
                background: loading ? '#9ca3af' : '#2563eb',
                color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {loading ? '⏳ Salvando...' : (isEditing ? '✅ Salvar Alterações' : '➕ Cadastrar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeviceForm;
