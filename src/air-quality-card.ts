console.info('%c AIR QUALITY CARD  v1.0 ', 'color: white; background: green; font-weight: bold;');

import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { fireEvent } from 'custom-card-helpers';
import './air-quality-card-editor';
import { formatNumber } from 'custom-card-helpers';


export type SensorType = 'co2' | 'voc' | 'pm25' | 'temperature' | 'humidity' | 'rating';

export interface AirQualityCardConfig {
  type: string;
  title?: string;
  width?: string;  // e.g., "100%", "400px"
  height?: string;
  entities: Partial<Record<SensorType, string>>;  // co2, voc, etc.
  show_bars?: SensorType[];  // explicitly typed for clarity
  recommendation?: string
  _customThresholds?: Record<SensorType, { min?: number; max?: number }>;
}




interface Thresholds {
  min: number;
  max: number;
  unit: string;
  icon: string;
  absoluteMin: number;
  absoluteMax: number;
}

const SENSOR_THRESHOLDS: Record<string, Thresholds> = {
  co2: { min: 400, max: 1000, unit: 'ppm', icon: 'mdi:molecule-co2', absoluteMin: 400, absoluteMax: 1300 },
  voc: { min: 0, max: 500, unit: 'ppb', icon: 'mdi:chemical-weapon', absoluteMin: 0, absoluteMax: 1000 },
  pm25: { min: 0, max: 35, unit: 'µg/m³', icon: 'mdi:blur', absoluteMin: 0, absoluteMax: 50 },
  temperature: { min: 18, max: 26, unit: '°C', icon: 'mdi:thermometer', absoluteMin: -20, absoluteMax: 60 },
  humidity: { min: 30, max: 60, unit: '%', icon: 'mdi:water-percent', absoluteMin: 0, absoluteMax: 100 },
};

const RATING_IMAGES: Record<string, string> = {
  excellent: '/local/airquality/excellent.png',
  good: '/local/airquality/good.png',
  moderate: '/local/airquality/moderate.png',
  poor: '/local/airquality/poor.png',
  unhealthy: '/local/airquality/unhealthy.png',
};

export class AirQualityCard extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property() private config!: AirQualityCardConfig;

  public setConfig(config: AirQualityCardConfig) {
    if (!config.entities) throw new Error('Entities required');
    this.config = config;
  }

  static styles = css`
    .card-wrapper {
      position: relative;
    }
    .badge {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      object-fit: cover;
      position: absolute;
      top: -45px;
      left: -15px;
      box-shadow: 0 0 8px rgba(0, 0, 0, 0.4);
      border: 3px solid var(--card-background-color);
    }
    ha-card {
      padding: 15px;
      overflow: visible;
      max-width: 100%;
      box-sizing: border-box;
    }
    .recommendation-text {
      margin-top: 16px;
      font-size: 14px;
      color: var(--primary-text-color);
      background: var(--secondary-background-color);
      padding: 10px;
      border-radius: 8px;
      line-height: 1.4;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .title {
      margin-left: 70px;
      font-weight: bold;
    }
    .attributes {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 12px;
      width: 100%;
    }
    .bar-container {
      display: flex;
      align-items: center;
      width: 100%;
      position: relative;
    }
    .icon {
      margin-right: 8px;
      font-size: 24px;
    }
    .bar {
      flex-grow: 1;
      height: 10px;
      border-radius: 3px;
      background: var(--primary-background-color);
      position: relative;
      overflow: hidden;
    }
    .value-above {
    text-align: right;
    font-size: 12px;
    color: var(--secondary-text-color);
    margin-bottom: 6px;
    padding-right: 2px;
    }

    .gradient {
      position: absolute;
      inset: 0;
      background: linear-gradient(to right,
        #1e8449 0%,
        #27ae60 25%,
        #2ecc71 50%,
        #f1c40f 60%,
        #e67e22 75%,
        #c0392b 90%,
        #922b21 100%);
      z-index: 1;
    }

    .mask {
      position: absolute;
      top: 0;
      bottom: 0;
      background: var(--primary-background-color);
      z-index: 2;
      right: 0;
    }

    .bar-wrapper {
      position: relative;
      flex-grow: 1;
    }

    .tooltip {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%) translateY(-8px);
      background: #555;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s;
      z-index: 10;
    }

    .bar-wrapper:hover .tooltip {
      visibility: visible;
      opacity: 1;
    }
  `;

  static getConfigElement(): Promise<HTMLElement> {
    return Promise.resolve(document.createElement('air-quality-card-editor'));
  }

  static getStubConfig(): Record<string, any> {
    return {
      type: 'custom:air-quality-card',
      title: 'Air Quality',
      entities: {},
    };
  }


  renderBar(key: string, entityId: string | undefined) {
    if (!entityId) return html``;
    const state = this.hass.states[entityId];
    if (!state || state.state === 'unavailable') return html``;

    const value = parseFloat(state.state);
    const name = state.attributes.friendly_name || key.toUpperCase();
    const threshold = SENSOR_THRESHOLDS[key];
    const custom = (this.config as any)._customThresholds?.[key] || {};
    const min = custom.min ?? threshold.min;
    const max = custom.max ?? threshold.max;
    const absoluteMin = custom.min ?? threshold.absoluteMin;
    const absoluteMax = custom.max ?? threshold.absoluteMax;
    const unit = threshold.unit;
    const icon = threshold.icon;

    const tooltip = `${name} — healthy: ${min}–${max} ${unit}`;

    const fillPercent = Math.max(0, Math.min(100, ((value - absoluteMin) / (absoluteMax - absoluteMin)) * 100));

    return html`
      <div
        class="bar-container"
        @click=${() => fireEvent(this, 'hass-more-info', { entityId })}
        style="cursor: pointer;"
        title="${tooltip}"
      >
        <ha-icon class="icon" icon="${icon}"></ha-icon>
        <div class="bar-wrapper">
          <div class="value-above">${value} ${unit}</div>
          <div class="bar">
            <div class="gradient"></div>
            <div class="mask" style="left: ${fillPercent}%; right: 0;"></div>
          </div>
          <div class="tooltip">${tooltip}</div>
        </div>
      </div>
    `;
  }



  isValueHealthy(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  }

  render() {
    const { title, entities } = this.config;
    const show_bars: SensorType[] = this.config.show_bars ?? Object.keys(entities) as SensorType[];
    const barElements = show_bars
      .filter((key: SensorType) => SENSOR_THRESHOLDS[key])
      .map((key: SensorType) => this.renderBar(key, entities[key]));

    const allHealthy = show_bars
      .filter(key => SENSOR_THRESHOLDS[key]) // skip "rating"
      .every((key: SensorType) => {
        const entityId = entities[key];
        const state = entityId ? this.hass.states[entityId] : undefined;
        if (!state || state.state === 'unavailable') return false;
        const value = parseFloat(state.state);
        const { min, max } = SENSOR_THRESHOLDS[key];
        return this.isValueHealthy(value, min, max);
      });


    const ratingEntityId = entities.rating;
    let rawState = '';
    let ratingKey = 'moderate';
    // console.log('[AirQualityCard] ratingEntityId:', ratingEntityId);
    // console.log('[AirQualityCard] rawState:', rawState);


    if (ratingEntityId && this.hass.states[ratingEntityId]) {
      const state = this.hass.states[ratingEntityId].state;
      rawState = state ?? ''; // ensure it's at least an empty string
      // console.log('[AirQualityCard] NewrawState:', rawState);

      const candidate = rawState.toLowerCase().trim();
      if (candidate && RATING_IMAGES.hasOwnProperty(candidate)) {
        ratingKey = candidate;
      } else {
        console.warn(`[AirQualityCard] Unknown air quality rating: "${rawState}" — defaulting to "moderate"`);
      }
    }

    const badgeImage = RATING_IMAGES[ratingKey];
    // console.log('[AirQualityCard] Available rating images:', Object.keys(RATING_IMAGES));




    return html`
      <ha-card style="width: ${this.config.width || '100%'}; height: ${this.config.height || 'auto'};">
        <div class="card-wrapper">
          <img class="badge" src="${badgeImage}" alt="${rawState}" />
          <div class="header">
            <div class="title">${title ? `${title} - ${rawState}` : rawState}</div>
          </div>
          <div class="attributes">
            ${barElements}
          </div>
        </div>
        ${this.config.recommendation && this.hass.states[this.config.recommendation]
          ? html`
              <div class="recommendation-text">
                ${this.hass.states[this.config.recommendation].state}
              </div>
            `
          : ''}
      </ha-card>
    `;
  }
}



if (!customElements.get('air-quality-card')) {
  customElements.define('air-quality-card', AirQualityCard);
}

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'air-quality-card',
  name: 'Air Quality Card',
  description: 'Displays air quality sensors with healthy ranges and gradients.',
  preview: true
});

console.info('🧪 Registering card...');

customElements.whenDefined('air-quality-card').then(() => {
  console.info('✅ air-quality-card is defined and ready.');
});

if (!customElements.get('air-quality-card')) {
  console.warn('🚨 air-quality-card not defined yet, defining now...');
  customElements.define('air-quality-card', AirQualityCard);
} else {
  console.info('✅ air-quality-card already defined');
}

