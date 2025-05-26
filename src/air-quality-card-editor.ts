import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, fireEvent } from 'custom-card-helpers';
import { AirQualityCardConfig, SensorType } from './air-quality-card';

@customElement('air-quality-card-editor')
export class AirQualityCardEditor extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @state() private _config!: AirQualityCardConfig;

  setConfig(config: AirQualityCardConfig) {
    this._config = { ...config };
  }

  static styles = css`
    .sensor-entry {
      margin-bottom: 12px;
      padding: 6px;
      border: 1px solid #ddd;
      border-radius: 6px;
    }
    .sensor-entry label {
      display: block;
      font-weight: bold;
      margin-bottom: 4px;
    }
    input[type="number"], input[type="text"] {
      background-color: rgb(110, 110, 110);
      color: #000;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 4px;
      width: 100%;
      box-sizing: border-box;
    }
  `;

  private _valueChanged(ev: Event, key: SensorType, field: string) {
    if (!this._config.entities) return;
    const target = ev.target as HTMLInputElement;
    const newVal = field === 'min' || field === 'max' ? parseFloat(target.value) : target.value;

    if (!this._config.entities[key]) this._config.entities[key] = '';

    if (!('_customThresholds' in this._config)) {
      (this._config as any)._customThresholds = {};
    }

    (this._config as any)._customThresholds[key] = {
      ...(this._config as any)._customThresholds?.[key],
      [field]: newVal
    };

    fireEvent(this, 'config-changed', { config: this._config });
  }

  render() {
    if (!this.hass || !this._config) return html``;

    const sensors: SensorType[] = ['co2', 'voc', 'pm25', 'temperature', 'humidity', 'rating'];
    const customThresholds = (this._config as any)._customThresholds || {};

    return html`
      <div class="card-config">
        <label>
          Title
          <input
            type="text"
            .value=${this._config.title || ''}
            @input=${(e: any) => {
              this._config.title = e.target.value;
              fireEvent(this, 'config-changed', { config: this._config });
            }}
          />
        </label>

        ${sensors.map(sensorKey => {
          const threshold = customThresholds[sensorKey] || {};
          return html`
            <div class="sensor-entry">
              <label>${sensorKey.toUpperCase()}</label>
              <ha-entity-picker
                .hass=${this.hass}
                .value=${this._config.entities?.[sensorKey] || ''}
                .configValue=${sensorKey}
                @value-changed=${(e: any) => {
                  this._config.entities = {
                    ...this._config.entities,
                    [sensorKey]: e.detail.value
                  };
                  fireEvent(this, 'config-changed', { config: this._config });
                }}
                allow-custom-entity
              ></ha-entity-picker>
              ${sensorKey !== 'rating' ? html`
                <label>Absolute Min</label>
                <input
                  type="number"
                  .value=${threshold.min ?? ''}
                  @input=${(e: Event) => this._valueChanged(e, sensorKey, 'min')}
                />
                <label>Absolute Max</label>
                <input
                  type="number"
                  .value=${threshold.max ?? ''}
                  @input=${(e: Event) => this._valueChanged(e, sensorKey, 'max')}
                />
              ` : ''}
            </div>
          `;
        })}
      </div>
    `;
  }
}
