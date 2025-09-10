interface JQuery {
    teSlider(options?: Partial<TeSliderOptions> | string, ...args: any[]): JQuery;
}

interface ResponsiveSettings {
    breakpoint: number;
    settings: Partial<TeSliderOptions>;
}

interface TeSliderOptions {
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
    dotsClass: string;
    appendDots: string | JQuery | null;
    customPaging: (slider: TeSlider, i: number) => JQuery;
    accessibility: boolean;
    adaptiveHeight: boolean;
    fade: boolean;
    initialSlide: number;
    gap: number;
    centerClass: string;
    onInit: ((slider: TeSlider) => void) | null;
    onBeforeChange: ((oldSlide: number, newSlide: number) => void) | null;
    onAfterChange: ((currentSlide: number) => void) | null;
    onDuringChange: ((slider: TeSlider) => void) | null;
}

class TeSlider {
    private static instanceUid = 0;

    private defaults: TeSliderOptions = {
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
        dotsClass: 'te-dots',
        appendDots: null,
        customPaging: (slider: TeSlider, i: number) => {
            return $('<button type="button"></button>').text(i + 1);
        },
        accessibility: true,
        adaptiveHeight: false,
        fade: false,
        initialSlide: 0,
        gap: 0,
        centerClass: 'scaled',
        onInit: null,
        onBeforeChange: null,
        onAfterChange: null,
        onDuringChange: null,
    };

    private currentIndex = 0;
    private autoplayTimer: number | null = null;
    private slidesToClone = 0;
    private originalSlidesCount = 0;
    private animating = false;
    private isSwiping = false;
    private duringChangeInterval: number | null = null;
    private $list!: JQuery;
    private $track!: JQuery;
    private $slides!: JQuery;
    private $dots: JQuery | null = null;
    private swipeStartX = 0;
    private swipeDeltaX = 0;
    private swipeTrackX = 0;
    private transitionStyle = '';

    private $slider: JQuery;
    public options: TeSliderOptions;
    private instanceUid: number;

    constructor(element: HTMLElement, settings?: Partial<TeSliderOptions>) {
        this.$slider = $(element);
        const dataOptions = this.$slider.data('te-slider-options') || {};
        this.options = $.extend({}, this.defaults, settings, dataOptions);

        if (this.options.appendDots === null) {
            this.options.appendDots = this.$slider;
        }

        this.instanceUid = TeSlider.instanceUid++;
        this.init();
    }

    public init(): void {
        if (this.$slider.hasClass('te-slider-initialized')) return;

        this.buildOut();
        this.buildDots();
        this.initializeEvents();

        if (this.options.accessibility) {
            this.initADA();
        }

        setTimeout(() => {
            let initialIndex = this.options.initialSlide || 0;
            if (this.options.loop && !this.options.fade) {
                initialIndex += this.slidesToClone;
            }
            this.goTo(initialIndex, true);

            if (this.options.autoplay) {
                this.startAutoplay();
            }

            if (this.options.onInit) {
                this.options.onInit(this);
            }
        }, 0);
    }

    private buildOut(): void {
        this.$slider.addClass("te-slider te-slider-initialized");
        this.$slides = this.$slider.children().addClass('te-slide');
        this.originalSlidesCount = this.$slides.length;

        this.$track = this.$slides.wrapAll('<div class="te-slider-track"></div>').parent();
        this.$list = this.$track.wrap('<div class="te-slider-list"></div>').parent();

        if (this.options.fade) {
            this.options.slidesToShow = 1;
            this.options.slidesToScroll = 1;
            this.options.centerMode = false;
            this.options.loop = false;
            this.$slides.css({ position: 'absolute', width: '100%', top: 0, left: 0, opacity: 0, zIndex: 1 });
        }

        this.transitionStyle = `transform ${this.options.duration / 1000}s ease`;

        if (this.options.loop && !this.options.fade) {
            const settings = this.getSettingsForWidth();
            this.slidesToClone = Math.ceil(Math.max(settings.slidesToShow!, settings.slidesToScroll!)) + 1;
            this.$slides.slice(-this.slidesToClone).clone().addClass('te-cloned').prependTo(this.$track);
            this.$slides.slice(0, this.slidesToClone).clone().addClass('te-cloned').appendTo(this.$track);
            this.$slides = this.$track.children();
        }
    }

    private buildDots(): void {
        if (this.options.dots && this.originalSlidesCount > this.getSettingsForWidth().slidesToShow!) {
            const dotsContainer = typeof this.options.appendDots === 'string' ? $(this.options.appendDots) : this.options.appendDots;
            if (!dotsContainer) return;
            const dotList = $('<ul></ul>');
            const dotCount = this.getDotCount();
            for (let i = 0; i < dotCount; i++) {
                dotList.append($('<li></li>').append(this.options.customPaging.call(this, this, i)));
            }
            this.$dots = dotList.appendTo(dotsContainer);
            this.$dots.find('li').first().addClass('active');
        }
    }

    private initializeEvents(): void {
        if (this.options.prevArrow) {
            const prevArrow = typeof this.options.prevArrow === 'string' ? $(this.options.prevArrow) : this.options.prevArrow;
            prevArrow.on("click.teSlider", this.prev.bind(this));
        }
        if (this.options.nextArrow) {
            const nextArrow = typeof this.options.nextArrow === 'string' ? $(this.options.nextArrow) : this.options.nextArrow;
            nextArrow.on("click.teSlider", this.next.bind(this));
        }
        if (this.$dots) this.$dots.on('click.teSlider', 'li', this.onDotClick.bind(this));

        this.$slider.on("touchstart.teSlider mousedown.teSlider", this.onSwipeStart.bind(this));
        this.$slider.on("touchmove.teSlider mousemove.teSlider", this.onSwipeMove.bind(this));
        this.$slider.on("touchend.teSlider mouseup.teSlider mouseleave.teSlider", this.onSwipeEnd.bind(this));
        $(window).on(`resize.teSlider.${this.instanceUid}`, this.onResize.bind(this));
    }

    private initADA(): void {
        this.$slider.attr('role', 'toolbar');
        this.$slides.attr('tabindex', '-1');
        if (this.$dots) this.$dots.attr('role', 'tablist');

        if (this.options.accessibility) {
            this.$list.on('keydown.teSlider', this.keyHandler.bind(this));
        }
        this.updateADA();
    }

    private updateADA(): void {
        if (!this.options.accessibility) return;

        const roundedCurrentIndex = Math.round(this.currentIndex);
        this.$slides.removeClass('te-slide-active').attr('aria-hidden', 'true');
        this.$slides.eq(roundedCurrentIndex).addClass('te-slide-active').attr('aria-hidden', 'false').attr('tabindex', '0');

        if (this.$dots) {
            const dotIndex = this.getDotIndex();
            this.$dots.find('li button').attr('aria-selected', 'false');
            this.$dots.find('li').eq(dotIndex).find('button').attr('aria-selected', 'true');
        }
    }

    private keyHandler(e: JQuery.KeyDownEvent): void {
        if (e.keyCode === 37) this.prev();
        if (e.keyCode === 39) this.next();
    }

    private getDotCount(): number {
        return Math.ceil(this.originalSlidesCount / this.getSettingsForWidth().slidesToScroll!);
    }

    private getDotIndex(): number {
        return Math.floor(this.getPublicIndex() / this.getSettingsForWidth().slidesToScroll!);
    }

    private updateDots(): void {
        if (this.$dots) {
            const dotIndex = this.getDotIndex();
            this.$dots.find('li').removeClass('active');
            this.$dots.find('li').eq(dotIndex).addClass('active');
        }
    }

    private onDotClick(e: JQuery.ClickEvent): void {
        e.preventDefault();
        e.stopPropagation();
        const index = $(e.currentTarget).index();
        const slideIndex = index * this.getSettingsForWidth().slidesToScroll!;
        this.publicGoTo(slideIndex);
    }

    private getPublicIndex(internalIndex?: number): number {
        const index = internalIndex !== undefined ? internalIndex : this.currentIndex;
        if (this.options.loop && !this.options.fade) {
            return (index - this.slidesToClone + this.originalSlidesCount) % this.originalSlidesCount;
        }
        return Math.max(0, Math.min(index, this.originalSlidesCount - 1));
    }

    private getSettingsForWidth(): Partial<TeSliderOptions> {
        const ww = $(window).width() || 0;
        const st: Partial<TeSliderOptions> = {
            slidesToShow: this.options.slidesToShow,
            slidesToScroll: this.options.slidesToScroll,
            centerMode: this.options.centerMode,
            gap: this.options.gap,
        };
        const sortedBps = [...this.options.responsive].sort((a, b) => a.breakpoint - b.breakpoint);
        for (const bp of sortedBps) {
            if (ww <= bp.breakpoint) {
                $.extend(st, bp.settings);
                break;
            }
        }
        return st;
    }

    private updateHeight(): void {
        if (this.options.adaptiveHeight) {
            const activeSlide = this.$slides.eq(Math.round(this.currentIndex));
            const targetHeight = activeSlide.outerHeight(true) || 0;
            this.$list.animate({ height: targetHeight }, this.options.duration);
        }
    }

    public render(dontAnimate?: boolean): void {
        const settings = this.getSettingsForWidth();

        if (!this.$slides || this.$slides.length === 0) return;

        const listWidth = this.$list.width() || 0;
        if (listWidth <= 0) return;

        const slidesToShow = settings.slidesToShow! > 0 ? settings.slidesToShow! : 1;
        const gap = settings.gap || 0;
        const slideOuterWidth = listWidth / slidesToShow;
        const slideWidth = slideOuterWidth - gap;

        if (!isFinite(slideWidth) || slideWidth < 0) return;

        const roundedCurrentIndex = Math.round(this.currentIndex);

        if (this.options.fade) {
            this.$slides.css({ transition: `opacity ${this.options.duration}ms ease`, opacity: 0, zIndex: 1 });
            this.$slides.eq(roundedCurrentIndex).css({ opacity: 1, zIndex: 2 });
        } else {
            this.$slides.css({
                "width": slideWidth + "px",
                "margin-left": (gap / 2) + "px",
                "margin-right": (gap / 2) + "px"
            });
            let trackOffset = this.currentIndex * slideOuterWidth;
            if (settings.centerMode) {
                const centeringOffset = (listWidth - slideOuterWidth) / 2;
                trackOffset -= centeringOffset;
            }
            this.$track.css({
                transform: `translateX(${-trackOffset}px)`,
                transition: dontAnimate ? 'none' : this.transitionStyle
            });
        }

        this.$slides.removeClass(`active ${this.options.centerClass}`);
        const half = Math.floor(slidesToShow / 2);

        const start = roundedCurrentIndex - half;
        const end = roundedCurrentIndex + half + 1;
        this.$slides.slice(start, end).addClass("active");
        this.$slides.eq(roundedCurrentIndex).addClass(this.options.centerClass);
    }

    public goTo(index: number, silent?: boolean): void {
        if (this.animating && !silent) return;

        const oldPublicIndex = this.getPublicIndex();
        if (!silent && this.options.onBeforeChange) {
            this.options.onBeforeChange(oldPublicIndex, this.getPublicIndex(index));
        }

        this.currentIndex = index;
        this.animating = true;
        this.render(silent);

        if (!silent) {
            this.clearDuringChangeInterval();
            if (this.options.onDuringChange) {
                this.duringChangeInterval = window.setInterval(() => {
                    this.options.onDuringChange!(this);
                }, 16);
            }
            setTimeout(this.onAnimationComplete.bind(this), this.options.duration);
        } else {
            this.onAnimationComplete();
        }
    }

    private onAnimationComplete(): void {
        this.clearDuringChangeInterval();

        if (this.options.loop && !this.options.fade) {
            if (this.currentIndex >= this.originalSlidesCount + this.slidesToClone) {
                this.currentIndex -= this.originalSlidesCount;
                this.render(true);
            }
            if (this.currentIndex < this.slidesToClone) {
                this.currentIndex += this.originalSlidesCount;
                this.render(true);
            }
        }

        this.animating = false;
        this.updateDots();
        this.updateHeight();
        this.updateADA();

        if (this.options.onAfterChange) {
            this.options.onAfterChange(this.getPublicIndex());
        }
    }

    private clearDuringChangeInterval(): void {
        if (this.duringChangeInterval) {
            clearInterval(this.duringChangeInterval);
            this.duringChangeInterval = null;
        }
    }

    public publicGoTo(index: number): void {
        let internalIndex = index;
        if (this.options.loop && !this.options.fade) {
            internalIndex += this.slidesToClone;
        }
        this.goTo(internalIndex, false);
    }

    public next(): void {
        const settings = this.getSettingsForWidth();
        const newIndex = this.currentIndex + settings.slidesToScroll!;
        if (!this.options.loop && newIndex > this.originalSlidesCount - settings.slidesToShow!) {
            return;
        }
        this.goTo(newIndex);
    }

    public prev(): void {
        const settings = this.getSettingsForWidth();
        const newIndex = this.currentIndex - settings.slidesToScroll!;
        if (!this.options.loop && newIndex < 0) {
            return;
        }
        this.goTo(newIndex);
    }

    public startAutoplay(): void {
        this.stopAutoplay();
        if (this.options.autoplay) {
            this.autoplayTimer = window.setInterval(this.next.bind(this), this.options.autoplaySpeed);
        }
    }

    public stopAutoplay(): void {
        if (this.autoplayTimer) clearInterval(this.autoplayTimer);
    }

    private onSwipeStart(e: JQuery.Event): void {
        if (this.animating) return;
        this.isSwiping = true;
        this.swipeStartX = (e.type === 'touchstart' ? (e as JQuery.TouchEventBase).originalEvent?.touches?.[0].pageX : (e as JQuery.MouseEventBase).pageX) || 0;
        this.swipeDeltaX = 0;
        const transformMatrix = this.$track.css("transform").replace(/[^0-9\-.,]/g, "").split(",");
        this.swipeTrackX = transformMatrix.length > 1 ? parseInt(transformMatrix[4], 10) : 0;
        this.$track.css('transition', 'none');
        this.stopAutoplay();
    }

    private onSwipeMove(e: JQuery.Event): void {
        if (!this.isSwiping) return;
        e.preventDefault();
        const currentX = (e.type === 'touchmove' ? (e as JQuery.TouchEventBase).originalEvent?.touches?.[0].pageX : (e as JQuery.MouseEventBase).pageX) || 0;
        if(currentX === 0) return;
        this.swipeDeltaX = currentX - this.swipeStartX;
        this.$track.css("transform", `translateX(${this.swipeTrackX + this.swipeDeltaX}px)`);
    }

    private onSwipeEnd(e: JQuery.Event): void {
        if (!this.isSwiping) return;
        this.isSwiping = false;

        if (Math.abs(this.swipeDeltaX) > 50) {
            if (this.swipeDeltaX < 0) this.next();
            else this.prev();
        } else {
            this.render();
        }
        this.startAutoplay();
    }

    private onResize(): void {
        this.render(true);
    }
}

(function($) {
    $.fn.teSlider = function(option: Partial<TeSliderOptions> | string, ...args: any[]) {
        return this.each(function() {
            const $this = $(this);
            let data = $this.data('teSlider');
            if (!data) {
                if (typeof option === 'object') {
                    $this.data('teSlider', (data = new TeSlider(this, option)));
                }
            } else {
                if (typeof option === 'string') {
                    if (option === 'goTo') {
                        (data as TeSlider).publicGoTo.apply(data, args as [number]);
                    } else if (typeof (data as any)[option] === 'function') {
                        (data as any)[option].apply(data, args);
                    }
                }
            }
        });
    };
})(jQuery);