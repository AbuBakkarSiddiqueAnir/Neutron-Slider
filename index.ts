interface JQuery {
  neutronSlider(
    options?: Partial<NeutronSliderOptions> | string,
    ...args: any[]
  ): JQuery;
}

interface ResponsiveSettings {
  breakpoint: number;
  settings: Partial<NeutronSliderOptions>;
}

interface NeutronSliderOptions {
  slidesToShow: number;
  slidesToScroll: number;
  centerMode: boolean;
  autoplay: boolean;
  autoplaySpeed: number;
  duration: number;
  responsive: ResponsiveSettings[];
  prevArrow: string | JQuery | null;
  nextArrow: string | JQuery | null;
  loop: boolean;
  dots: boolean;
  pauseOnHover: boolean,
  dotsClass: string;
  appendDots: string | JQuery | null;
  customPaging: (slider: NeutronSlider, i: number) => JQuery;
  accessibility: boolean;
  adaptiveHeight: boolean;
  initialSlide: number;
  gap: number;
  centerClass: string;
  onInit: ((slider: NeutronSlider) => void) | null;
  onBeforeChange: ((oldSlide: number, newSlide: number) => void) | null;
  onAfterChange: ((currentSlide: number) => void) | null;
  onDuringChange: ((slider: NeutronSlider) => void) | null;
}

class NeutronSlider {
  static #instanceUid = 0;

  #defaults: NeutronSliderOptions = {
    slidesToShow: 1,
    slidesToScroll: 1,
    centerMode: false,
    autoplay: false,
    autoplaySpeed: 3000,
    duration: 500,
    responsive: [],
    prevArrow: null,
    nextArrow: null,
    loop: true,
    dots: false,
    pauseOnHover: true,
    dotsClass: "neutron-dots",
    customPaging: (slider: NeutronSlider, i: number) => {
      return $('<button type="button"></button>').text(i + 1);
    },
    accessibility: true,
    adaptiveHeight: false,
    initialSlide: 0,
    /**
     * The space between slides in pixels.
     * @type {number}
     */
    gap: 0,
    /**
     * Class to add to the centered slide.
     * @type {string}
     */
    centerClass: "center-slide",
    /**
     * Fires after the slider is initialized.
     * @param {object} slider The slider instance.
     */
    onInit: null,
    appendDots: null,
    /**
     * Fires before a slide changes.
     * @param {number} oldSlide Index of the current slide.
     * @param {number} newSlide Index of the next slide.
     */
    onBeforeChange: null,
    /**
     * Fires after a slide changes.
     * @param {number} currentSlide Index of the current slide.
     */
    onAfterChange: null,
    /**
     * Fires repeatedly during the slide transition animation.
     * The interval is roughly 60fps.
     *
     * @param {object} slider The slider instance.
     */
    onDuringChange: null,
  };

  #currentIndex = 0;
  #autoplayTimer: number | null = null;
  #slidesToClone = 0;
  #originalSlidesCount = 0;
  #animating = false;
  #isSwiping = false;
  #duringChangeInterval: number | null = null;
  #$list!: JQuery;
  #$track!: JQuery;
  #$slides!: JQuery;
  #$dots: JQuery | null = null;
  #swipeStartX = 0;
  #swipeDeltaX = 0;
  #swipeTrackX = 0;
  #swipeStartTime!: number;

  #transitionStyle = "";

  private $slider: JQuery;
  public options: NeutronSliderOptions;
  private InstanceUid: number;

  constructor(element: HTMLElement, settings?: Partial<NeutronSliderOptions>) {
    this.$slider = $(element);
    const dataOptions = this.$slider.data("neutron-slider-options") || {};
    this.options = $.extend({}, this.#defaults, settings, dataOptions);

    if (this.options.appendDots === null) {
      this.options.appendDots = this.$slider;
    }

    this.InstanceUid = NeutronSlider.#instanceUid++;
    this.init();
  }

  public init(): void {
    if (this.$slider.hasClass("neutron-slider-initialized")) return;

    this.#buildOut();
    this.#buildDots();
    this.#initializeEvents();

    if (this.options.accessibility) {
      this.#initADA();
    }

    setTimeout(() => {
      let initialIndex = this.options.initialSlide || 0;

      this.goTo(initialIndex, true);

      if (this.options.autoplay) {
        this.startAutoplay();
      }

      if (this.options.onInit) {
        this.options.onInit(this);
      }
    }, 0);
  }

  #initADA(): void {
    this.$slider.attr("role", "toolbar");
    this.#$slides.attr("tabindex", "-1");
    if (this.#$dots) this.#$dots.attr("role", "tablist");

    if (this.options.accessibility) {
      this.#$list.on("keydown.neutronSlider", this.keyHandler.bind(this));
    }
    this.#updateADA();
  }
  #updateADA(): void {
    if (!this.options.accessibility) return;

    const roundedCurrentIndex = Math.round(this.#currentIndex);
    this.#$slides.removeClass("neutron-slide-active").attr("aria-hidden", "true");
    this.#$slides
      .eq(roundedCurrentIndex)
      .addClass("neutron-slide-active")
      .attr("aria-hidden", "false")
      .attr("tabindex", "0");

    if (this.#$dots) {
      const dotIndex = this.#getDotIndex();
      this.#$dots.find("li button").attr("aria-selected", "false");
      this.#$dots
        .find("li")
        .eq(dotIndex)
        .find("button")
        .attr("aria-selected", "true");
    }
  }

  private keyHandler(e: JQuery.KeyDownEvent): void {
    if (e?.keyCode === 37) this.prev();
    if (e?.keyCode === 39) this.next();
  }

  #buildOut(): void {
    this.$slider.addClass("neutron-slider neutron-slider-initialized");
    this.#$slides = this.$slider.children().addClass("neutron-slide");
    this.#originalSlidesCount = this.#$slides.length;

    this.#$track = this.#$slides
      .wrapAll('<div class="neutron-slider-track"></div>')
      .parent();
    this.#$list = this.#$track
      .wrap('<div class="neutron-slider-list"></div>')
      .parent();

    this.#transitionStyle = `transform ${this.options.duration / 1000}s ease`;

    if (this.options.loop) {
      const settings = this.#getSettingsForWidth();
      this.#slidesToClone =
        Math.ceil(Math.max(settings.slidesToShow!, settings.slidesToScroll!)) +
        1;
      this.#$slides
        .slice(-this.#slidesToClone)
        .clone()
        .addClass("neutron-cloned")
        .prependTo(this.#$track);
      this.#$slides
        .slice(0, this.#slidesToClone)
        .clone()
        .addClass("neutron-cloned")
        .appendTo(this.#$track);
      this.#$slides = this.#$track.children();
    }
  }

  #buildDots(): void {
    if (
      this.options.dots &&
      this.#originalSlidesCount > this.#getSettingsForWidth().slidesToShow!
    ) {
      const dotsContainer =
        typeof this.options.appendDots === "string"
          ? $(this.options.appendDots)
          : this.options.appendDots;
      if (!dotsContainer) return;
      const dotList = $("<ul class='neutron-dots'></ul>");
      const dotCount = this.#getDotCount();
      for (let i = 0; i < dotCount; i++) {
        dotList.append(
          $("<li></li>").append(this.options.customPaging.call(this, this, i))
        );
      }
      this.#$dots = dotList.appendTo(dotsContainer);
      this.#$dots.find("li").first().addClass("neutron-slide-active");
    }
  }

  #initializeEvents(): void {
    if (this.options.prevArrow && typeof this.options.prevArrow === "string") {
      $(this.options.prevArrow).on("click.neutronSlider", this.prev.bind(this));
    }
    if (this.options.nextArrow && typeof this.options.nextArrow === "string") {
      $(this.options.nextArrow).on("click.neutronSlider", this.next.bind(this));
    }
    if (this.#$dots)
      this.#$dots.on("click.neutronSlider", "li", this.onDotClick.bind(this));

    this.$slider.on(
      "touchstart.neutronSlider mousedown.neutronSlider",
      this.#onSwipeStart.bind(this)
    );
    this.$slider.on(
      "touchmove.neutronSlider mousemove.neutronSlider",
      this.#onSwipeMove.bind(this)
    );
    this.$slider.on(
      "touchend.neutronSlider mouseleave.neutronSlider",
      this.#onSwipeEnd.bind(this)
    );
    $(window).on("resize.neutronSlider." + this.InstanceUid,this.onResize.bind(this));

    if (this.options.autoplay && this.options.pauseOnHover) {
       this.$slider.on('mouseenter.neutronSlider',this.stopAutoplay.bind(this));
       this.$slider.on('mouseleave.neutronSlider',this.startAutoplay.bind(this));
    }
  }

  #onSwipeStart(e:JQuery.TouchStartEvent | JQuery.MouseDownEvent) {
    if (this.#animating) return;
    this.#isSwiping = true;
    this.#swipeStartX = (
      e.type === "touchstart" ? e?.originalEvent?.touches[0]! : e
    ).pageX;
    this.#swipeStartTime = new Date().getTime();
    this.#swipeDeltaX = 0;
    const transformMatrix = this.#$track
      .css("transform")
      .replace(/[^0-9\-.,]/g, "")
      .split(",");
    this.#swipeTrackX =
      transformMatrix.length > 1 ? parseInt(transformMatrix[4], 10) : 0;
    this.#$track.css("transition", "none");
    this.stopAutoplay();
  }

  #onSwipeMove(e:JQuery.TouchMoveEvent | JQuery.MouseMoveEvent) {
    if (!this.#isSwiping) return;
    e.preventDefault();
    const currentX = (e.type === "touchmove" ? e.originalEvent?.touches[0]! : e)
      .pageX;
    this.#swipeDeltaX = currentX - this.#swipeStartX;
    this.#$track.css(
      "transform",
      "translateX(" + (this.#swipeTrackX + this.#swipeDeltaX) + "px)"
    );
  }

  #onSwipeEnd() {
    if (!this.#isSwiping) return;
    this.#isSwiping = false;

    const swipeDuration = new Date().getTime() - this.#swipeStartTime;
    const swipeVelocity = Math.abs(this.#swipeDeltaX / swipeDuration);

    if (Math.abs(this.#swipeDeltaX) > 50) {
      let slidesToScroll = Math.max(1, Math.floor(swipeVelocity * 0.5));
      const settings = this.#getSettingsForWidth();
      let newIndex;
      if (this.#swipeDeltaX < 0) {
        newIndex = this.#currentIndex + slidesToScroll;
      } else {
        newIndex = this.#currentIndex - slidesToScroll;
      }
      if (!this.options.loop) {
        if (this.#swipeDeltaX < 0) {
          newIndex = Math.min(
            newIndex,
            this.#originalSlidesCount - settings.slidesToShow!
          );
        } else {
          newIndex = Math.max(newIndex, 0);
        }
      }
      this.goTo(newIndex);
    } else {
      this.render();
    }
    this.startAutoplay();
  }

  onResize() {
    this.render(true);
  }

  prev(): void {
    const settings = this.#getSettingsForWidth();
    const newIndex = this.#currentIndex - settings.slidesToScroll!;
    if (!this.options.loop && newIndex < 0) {
      return;
    }
    this.goTo(newIndex);
  }

  next(): void {
    const setting = this.#getSettingsForWidth();
    const newIndex = this.#currentIndex + setting.slidesToScroll!;
    if(!this.options.loop && newIndex > this.#originalSlidesCount - setting.slidesToShow!) return;
    this.goTo(newIndex);
  }

  goTo(index: number, silent?: boolean): void {
    if (this.#animating && !silent) return;

    const oldPublicIndex = this.#getPublicIndex();
    if (!silent && this.options.onBeforeChange) {
      this.options.onBeforeChange(oldPublicIndex, this.#getPublicIndex(index));
    }

    this.#currentIndex = index;
    this.#animating = true;
    this.render(silent);

    if (!silent) {
      this.clearDuringChangeInterval();
      if (this.options.onDuringChange) {
        this.#duringChangeInterval = window.setInterval(() => {
          this.options.onDuringChange!(this);
        }, 16);
      }
      setTimeout(this.onAnimationComplete.bind(this), this.options.duration);
    } else {
      this.onAnimationComplete();
    }
  }

  onAnimationComplete() {
    this.clearDuringChangeInterval();
    if (this.options.loop) {
      if (
        this.#currentIndex >=
        this.#originalSlidesCount + this.#slidesToClone
      ) {
        this.#currentIndex = this.#currentIndex - this.#originalSlidesCount;
        this.render(true);
      }
      if (this.#currentIndex < this.#slidesToClone) {
        this.#currentIndex = this.#currentIndex + this.#originalSlidesCount;
        this.render(true);
      }
    }
    this.#animating = false;
    this.#updateDots();
    this.#updateHeight();
    this.#updateADA();
  }

  #updateDots() {
    if (this.#$dots) {
      const dotIndex = this.#getDotIndex();
      this.#$dots.find("li").removeClass("neutron-slide-active");
      this.#$dots.find("li").eq(dotIndex).addClass("neutron-slide-active");
    }
  }
  private onDotClick(e: JQuery.ClickEvent): void {
    e.preventDefault();
    e.stopPropagation();
    const index = $(e.currentTarget).index();
    const slideIndex = index * this.#getSettingsForWidth().slidesToScroll!;
    this.publicGoTo(slideIndex);
  }

  public publicGoTo(index: number): void {
    let internalIndex = index;
    if (this.options.loop) {
      internalIndex += this.#slidesToClone;
    }
    this.goTo(internalIndex, false);
  }

  #updateHeight() {
    if (this.options.adaptiveHeight) {
      const activeSlide = this.#$slides.eq(Math.round(this.#currentIndex));
      const targetHeight = activeSlide.outerHeight(true);
      this.#$list.animate({ height: targetHeight }, this.options.duration);
    }
  }

  #getDotCount(): number {
    return Math.ceil(
      this.#originalSlidesCount / this.#getSettingsForWidth().slidesToScroll!
    );
  }
  #getDotIndex(): number {
    return Math.floor(
      this.#getPublicIndex() / this.#getSettingsForWidth().slidesToScroll!
    );
  }

  #getPublicIndex(internalIndex?: number): number {
    const index =
      internalIndex !== undefined ? internalIndex : this.#currentIndex;
    if (this.options.loop) {
      return (
        (index - this.#slidesToClone + this.#originalSlidesCount) %
        this.#originalSlidesCount
      );
    }
    return Math.max(0, Math.min(index, this.#originalSlidesCount - 1));
  }

  #getSettingsForWidth(): Partial<NeutronSliderOptions> {
    const ww = $(window).width()!;
    const st = {
      slidesToShow: this.options.slidesToShow,
      slidesToScroll: this.options.slidesToScroll,
      centerMode: this.options.centerMode,
      gap: this.options.gap,
    };
    const sortedBps = [...this.options.responsive].sort(
      (a, b) => a.breakpoint - b.breakpoint
    );

    for (const bp of sortedBps) {
      if (ww <= bp.breakpoint) {
        $.extend(st, bp.settings);
        break;
      }
    }
    return st;
  }

  public render(dontAnimate?: boolean): void {
    const settings = this.#getSettingsForWidth();

    if (!this.#$slides || this.#$slides.length === 0) return;

    const listWidth = this.#$list.width() || 0;
    if (listWidth <= 0) return;

    const slidesToShow =
      settings.slidesToShow! > 0 ? settings.slidesToShow! : 1;
    const gap = settings.gap || 0;
    const slideOuterWidth = listWidth / slidesToShow;
    const slideWidth = slideOuterWidth - gap;

    if (!isFinite(slideWidth) || slideWidth < 0) return;

    const roundedCurrentIndex = Math.round(this.#currentIndex);

    this.#$slides.css({
      width: slideWidth + "px",
      "margin-left": gap / 2 + "px",
      "margin-right": gap / 2 + "px",
    });
    let trackOffset = this.#currentIndex * slideOuterWidth;
    if (settings.centerMode) {
      const centeringOffset = (listWidth - slideOuterWidth) / 2;
      trackOffset -= centeringOffset;
    }
    this.#$track.css({
      transform: `translateX(${-trackOffset}px)`,
      transition: dontAnimate ? "none" : this.#transitionStyle,
    });

    this.#$slides.removeClass(`neutron-slide-active ${this.options.centerClass}`);
    const half = Math.floor(slidesToShow / 2);

    const start = roundedCurrentIndex - half;
    const end = roundedCurrentIndex + half + 1;
    this.#$slides.slice(start, end).addClass("neutron-slide-active");
    this.#$slides.eq(roundedCurrentIndex).addClass(this.options.centerClass);
  }

  clearDuringChangeInterval() {
    if (this.#duringChangeInterval) {
      clearInterval(this.#duringChangeInterval);
      this.#duringChangeInterval = null;
    }
  }

  public startAutoplay(): void {
    this.stopAutoplay();
    if (this.options.autoplay) {
      this.#autoplayTimer = window.setInterval(
        this.next.bind(this),
        this.options.autoplaySpeed
      );
    }
  }

  public stopAutoplay(): void {
    if (this.#autoplayTimer) clearInterval(this.#autoplayTimer);
  }
}

(function ($) {
  $.fn.neutronSlider = function (
    option: Partial<NeutronSliderOptions> | string,
    ...args: any[]
  ) {
    return this.each(function () {
      const $this = $(this);
      let data = $this.data("neutronSlider");
      if (!data){
        if(typeof option === 'object'){
            $this.data('neutronSlider',(data = new NeutronSlider(this, option)))
        }
      } else {
        if (typeof option === "string") {
          if (option === "goTo") {
            (data as NeutronSlider).publicGoTo.apply(data, args as [number]);
          } else if (typeof (data as any)[option] === "function") {
            (data as any)[option].apply(data, args);
          }
        }
      }
    });
  };
})(jQuery);
