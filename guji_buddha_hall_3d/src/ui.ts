import { HotspotConfig } from "./hotspots";
import { formatDateTime, LampRecord, OfferingType } from "./storage";
import { OFFERING_LABELS } from "./offerings";

interface UIOptions {
  onOffering(type: OfferingType): void;
  onClearOfferings(): void;
  onConfirmLamp(id: string, name: string): void;
  onClearLamps(): void;
  onResetView(): void;
}

export class AppUI {
  private offeringPanel = document.getElementById("offeringPanel") as HTMLElement;
  private offeringButtons = document.getElementById("offeringButtons") as HTMLElement;
  private lampModal = document.getElementById("lampModal") as HTMLElement;
  private lampModalTitle = document.getElementById("lampModalTitle") as HTMLElement;
  private lampInfo = document.getElementById("lampInfo") as HTMLElement;
  private lampNameLabel = document.getElementById("lampNameLabel") as HTMLElement;
  private lampNameInput = document.getElementById("lampNameInput") as HTMLInputElement;
  private lampError = document.getElementById("lampError") as HTMLElement;
  private confirmLampBtn = document.getElementById("confirmLampBtn") as HTMLButtonElement;
  private tooltip = document.getElementById("tooltip") as HTMLElement;
  private activeLamp?: HotspotConfig;

  constructor(private options: UIOptions) {
    this.buildOfferingButtons();
    document.getElementById("closeOfferingPanelBtn")?.addEventListener("click", () => this.closeOfferingPanel());
    document.getElementById("clearOfferingsBtn")?.addEventListener("click", (event) => {
      event.preventDefault();
      options.onClearOfferings();
    });
    document.getElementById("closeLampModalBtn")?.addEventListener("click", () => this.closeLampModal());
    document.getElementById("clearLampsBtn")?.addEventListener("click", (event) => {
      event.preventDefault();
      options.onClearLamps();
    });
    document.getElementById("resetViewBtn")?.addEventListener("click", options.onResetView);
    this.confirmLampBtn.addEventListener("click", () => this.confirmLamp());
    this.lampNameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") this.confirmLamp();
    });
    this.lampModal.addEventListener("click", (event) => {
      if (event.target === this.lampModal) this.closeLampModal();
    });
  }

  openOfferingPanel(): void {
    this.offeringPanel.classList.add("open");
    this.offeringPanel.setAttribute("aria-hidden", "false");
  }

  closeOfferingPanel(): void {
    this.offeringPanel.classList.remove("open");
    this.offeringPanel.setAttribute("aria-hidden", "true");
  }

  openLampModal(config: HotspotConfig, record?: LampRecord): void {
    this.activeLamp = config;
    this.lampModalTitle.textContent = record ? config.label : `點燈 - ${config.label}`;
    this.lampError.textContent = "";
    if (record) {
      this.lampInfo.innerHTML = `此燈已點亮<br>點燈者：<b>${escapeHtml(record.name)}</b><br>時間：${formatDateTime(record.litAt)}`;
      this.lampNameLabel.style.display = "none";
      this.confirmLampBtn.style.display = "none";
    } else {
      this.lampInfo.textContent = "請輸入名字，確認後才會點亮佛燈。";
      this.lampNameLabel.style.display = "grid";
      this.confirmLampBtn.style.display = "inline-block";
      this.lampNameInput.value = "";
      requestAnimationFrame(() => this.lampNameInput.focus());
    }
    this.lampModal.classList.add("open");
    this.lampModal.setAttribute("aria-hidden", "false");
  }

  closeLampModal(): void {
    this.lampModal.classList.remove("open");
    this.lampModal.setAttribute("aria-hidden", "true");
    this.activeLamp = undefined;
  }

  showTooltip(text: string, x: number, y: number): void {
    this.tooltip.innerHTML = text;
    this.tooltip.style.display = "block";
    this.tooltip.setAttribute("aria-hidden", "false");
    const rect = this.tooltip.getBoundingClientRect();
    const left = Math.min(window.innerWidth - rect.width - 12, x + 14);
    const top = Math.min(window.innerHeight - rect.height - 12, y + 14);
    this.tooltip.style.left = `${Math.max(12, left)}px`;
    this.tooltip.style.top = `${Math.max(12, top)}px`;
  }

  hideTooltip(): void {
    this.tooltip.style.display = "none";
    this.tooltip.setAttribute("aria-hidden", "true");
  }

  private buildOfferingButtons(): void {
    (Object.keys(OFFERING_LABELS) as OfferingType[]).forEach((type) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.offering = type;
      button.textContent = OFFERING_LABELS[type];
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        console.info("Offering button clicked", type);
        this.options.onOffering(type);
      });
      this.offeringButtons.appendChild(button);
    });
  }

  private confirmLamp(): void {
    if (!this.activeLamp) return;
    const name = this.lampNameInput.value.trim();
    if (!name) {
      this.lampError.textContent = "請先輸入名字。";
      this.lampNameInput.focus();
      return;
    }
    this.options.onConfirmLamp(this.activeLamp.id, name);
    this.closeLampModal();
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return map[char] ?? char;
  });
}
