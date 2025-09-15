/**
 * TeSlider - jQuery-based slider/carousel.
 *
 * Usage:
 *   $('.my-slider').teSlider(options);
 *   $('.my-slider').teSlider('next');
 *   $('.my-slider').teSlider('goTo', 2);
 *
 * Options (with defaults):
 *   slidesToShow: 1               // Number of slides visible
 *   slidesToScroll: 1             // Number of slides per scroll
 *   centerMode: false             // Center the active slide
 *   autoplay: false               // Enable autoplay
 *   autoplaySpeed: 3000           // Autoplay interval (ms)
 *   duration: 500                  // Transition duration (ms)
 *   pauseOnHover: true            // Pause autoplay on hover
 *   responsive: []                // [{ breakpoint, settings }]
 *   prevArrow: null               // Selector for custom prev arrow
 *   nextArrow: null               // Selector for custom next arrow
 *   loop: true                    // Infinite loop mode
 *   dots: false                   // Show navigation dots
 *   dotsClass: "te-dots"          // Class for dots container
 *   appendDots: null              // Container for dots (defaults to slider)
 *   accessibility: true           // Keyboard + ARIA roles
 *   adaptiveHeight: false         // Match height to active slide
 *   fade: false                   // Fade instead of slide
 *   initialSlide: 0               // Starting slide index
 *   gap: 0                        // Space (px) between slides
 *   centerClass: "scaled"         // Extra class for centered slide
 * 
 *
 * Callbacks:
 *   onInit(slider)                // After initialization
 *   onBeforeChange(oldIdx, newIdx)// Before slide change
 *   onAfterChange(currentIdx)     // After slide change
 *   onDuringChange(slider)        // Called continuously during animation
 *
 * Public API (via $('.my-slider').teSlider('methodName')):
 *   next()              // Go to next slide
 *   prev()              // Go to previous slide
 *   goTo(index)         // Go to slide at index
 *   publicGoTo(index)   // Go to index with loop-handling
 *   startAutoplay()     // Start autoplay
 *   stopAutoplay()      // Stop autoplay
 *   render(dontAnimate) // Re-render layout
 *   updateDots()        // Refresh dot state
 *   updateHeight()      // Recalculate height
 *   onResize()          // Trigger resize handling
 */

;(function(factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define(['jquery'], factory);
    } else if (typeof exports !== 'undefined') {
        module.exports = factory(require('jquery'));
    } else {
        factory(jQuery);
    }
}(function($) {
    'use strict';
    const TeSlider = window.TeSlider || {};

    TeSlider = (function() {
        let instanceUid = 0;

        function TeSlider(element, settings) {
            const _globalSliderContext = this;

           _globalSliderContext.defaults = {
                slidesToShow: 1,
                slidesToScroll: 1,
                centerMode: false,
                autoplay: false,
                autoplaySpeed: 3000,
                duration: 500,
                pauseOnHover: true,
                responsive: [],
                prevArrow: null,
                nextArrow: null,
                loop: true,
                dots: false,
                dotsClass: 'te-dots',
                appendDots: null,
                customPaging: function(slider, i) {
                    return $('<button type="button"></button>').text(i + 1);
                },
                accessibility: true,
                adaptiveHeight: false,
                fade: false,
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
                centerClass: 'scaled',
                /**
                 * Fires after the slider is initialized.
                 * @param {object} slider The slider instance.
                 */
                onInit: null,
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

           _globalSliderContext.initials = {
                currentIndex: 0,
                autoplayTimer: null,
                slidesToClone: 0,
                originalSlidesCount: 0,
                animating: false,
                isSwiping: false,
                duringChangeInterval: null,
                $list: null,
                $track: null,
                $slides: null,
                $dots: null,
            };

           _globalSliderContext.$slider = $(element);
           _globalSliderContext.options = $.extend({},_globalSliderContext.defaults, settings,_globalSliderContext.$slider.data('te-slider-options') || {});
            
            if (_globalSliderContext.options.appendDots === null) {
               _globalSliderContext.options.appendDots =_globalSliderContext.$slider;
            }

            $.extend(_globalSliderContext,_globalSliderContext.initials);
           _globalSliderContext.instanceUid = instanceUid++;

           _globalSliderContext.init();
        }

        return TeSlider;
    }());

    TeSlider.prototype.init = function() {
        const _globalSliderContext = this;
        if (_globalSliderContext.$slider.hasClass('te-slider-initialized')) return;

       _globalSliderContext.buildOut();
       _globalSliderContext.buildDots();
       _globalSliderContext.initializeEvents();
        
        if (_globalSliderContext.options.accessibility) {
           _globalSliderContext.initADA();
        }

        setTimeout(function() {
            const initialIndex =_globalSliderContext.options.initialSlide || 0;
            if (_globalSliderContext.options.loop && !_globalSliderContext.options.fade) {
                initialIndex +=_globalSliderContext.slidesToClone;
            }
           _globalSliderContext.goTo(initialIndex, true);

            if (_globalSliderContext.options.autoplay) {
               _globalSliderContext.startAutoplay();
            }

            if (_globalSliderContext.options.onInit) {
               _globalSliderContext.options.onInit(_globalSliderContext);
            }
        }, 0);
    };

    TeSlider.prototype.buildOut = function() {
        const _globalSliderContext = this;
       _globalSliderContext.$slider.addClass("te-slider te-slider-initialized");
       _globalSliderContext.$slides =_globalSliderContext.$slider.children().addClass('te-slide');
       _globalSliderContext.originalSlidesCount =_globalSliderContext.$slides.length;
        
       _globalSliderContext.$track =_globalSliderContext.$slides.wrapAll('<div class="te-slider-track"></div>').parent();
       _globalSliderContext.$list =_globalSliderContext.$track.wrap('<div class="te-slider-list"></div>').parent();

        if (_globalSliderContext.options.fade) {
           _globalSliderContext.options.slidesToShow = 1;
           _globalSliderContext.options.slidesToScroll = 1;
           _globalSliderContext.options.centerMode = false;
           _globalSliderContext.options.loop = false;
           _globalSliderContext.$slides.css({ position: 'absolute', width: '100%', top: 0, left: 0, opacity: 0, zIndex: 1 });
        }

       _globalSliderContext.transitionStyle = 'transform ' + (_globalSliderContext.options.duration / 1000) + 's ease';

        if (_globalSliderContext.options.loop && !_globalSliderContext.options.fade) {
            const settings =_globalSliderContext.getSettingsForWidth();
           _globalSliderContext.slidesToClone = Math.ceil(Math.max(settings.slidesToShow, settings.slidesToScroll)) + 1;
           _globalSliderContext.$slides.slice(-_globalSliderContext.slidesToClone).clone().addClass('te-cloned').prependTo(_globalSliderContext.$track);
           _globalSliderContext.$slides.slice(0,_globalSliderContext.slidesToClone).clone().addClass('te-cloned').appendTo(_globalSliderContext.$track);
           _globalSliderContext.$slides =_globalSliderContext.$track.children();
        }
    };

    TeSlider.prototype.buildDots = function() {
        const _globalSliderContext = this;
        let i;
        if (_globalSliderContext.options.dots &&_globalSliderContext.originalSlidesCount >_globalSliderContext.getSettingsForWidth().slidesToShow) {
            const dotsContainer = $(_globalSliderContext.options.appendDots);
            const dotList = $('<ul></ul>');
            const dotCount =_globalSliderContext.getDotCount();
            for (i = 0; i < dotCount; i++) {
                dotList.append($('<li></li>').append(_globalSliderContext.options.customPaging.call(this,_globalSliderContext, i)));
            }
           _globalSliderContext.$dots = dotList.appendTo(dotsContainer);
           _globalSliderContext.$dots.find('li').first().addClass('active');
        }
    };

    TeSlider.prototype.initializeEvents = function() {
        const _globalSliderContext = this;
        if (_globalSliderContext.options.prevArrow) $(_globalSliderContext.options.prevArrow).on("click.teSlider",_globalSliderContext.prev.bind(_globalSliderContext));
        if (_globalSliderContext.options.nextArrow) $(_globalSliderContext.options.nextArrow).on("click.teSlider",_globalSliderContext.next.bind(_globalSliderContext));
        if (_globalSliderContext.$dots)_globalSliderContext.$dots.on('click.teSlider', 'li',_globalSliderContext.onDotClick.bind(_globalSliderContext));

       _globalSliderContext.$slider.on("touchstart.teSlider mousedown.teSlider",_globalSliderContext.onSwipeStart.bind(_globalSliderContext));
       _globalSliderContext.$slider.on("touchmove.teSlider mousemove.teSlider",_globalSliderContext.onSwipeMove.bind(_globalSliderContext));
       _globalSliderContext.$slider.on("touchend.teSlider mouseup.teSlider mouseleave.teSlider",_globalSliderContext.onSwipeEnd.bind(_globalSliderContext));
        $(window).on("resize.teSlider." + _globalSliderContext.instanceUid,_globalSliderContext.onResize.bind(_globalSliderContext));

        if (_globalSliderContext.options.autoplay && _globalSliderContext.options.pauseOnHover) {
           _globalSliderContext.$slider.on('mouseenter.teSlider',_globalSliderContext.stopAutoplay.bind(_globalSliderContext));
           _globalSliderContext.$slider.on('mouseleave.teSlider',_globalSliderContext.startAutoplay.bind(_globalSliderContext));
        }
    };

    TeSlider.prototype.initADA = function() {
        const _globalSliderContext = this;
       _globalSliderContext.$slider.attr('role', 'toolbar');
       _globalSliderContext.$slides.attr('tabindex', '-1');
        if (_globalSliderContext.$dots)_globalSliderContext.$dots.attr('role', 'tablist');
        
        if (_globalSliderContext.options.accessibility) {
           _globalSliderContext.$list.on('keydown.teSlider',_globalSliderContext.keyHandler.bind(_globalSliderContext));
        }
       _globalSliderContext.updateADA();
    };

    TeSlider.prototype.updateADA = function() {
        const _globalSliderContext = this;
        if (!_globalSliderContext.options.accessibility) return;

        const roundedCurrentIndex = Math.round(_globalSliderContext.currentIndex);
       _globalSliderContext.$slides.removeClass('te-slide-active').attr('aria-hidden', 'true');
       _globalSliderContext.$slides.eq(roundedCurrentIndex).addClass('te-slide-active').attr('aria-hidden', 'false').attr('tabindex', '0');

        if (_globalSliderContext.$dots) {
            const dotIndex =_globalSliderContext.getDotIndex();
           _globalSliderContext.$dots.find('li button').attr('aria-selected', 'false');
           _globalSliderContext.$dots.find('li').eq(dotIndex).find('button').attr('aria-selected', 'true');
        }
    };

    TeSlider.prototype.keyHandler = function(e) {
        const _globalSliderContext = this;
        if (e.keyCode === 37)_globalSliderContext.prev();
        if (e.keyCode === 39)_globalSliderContext.next();
    };

    TeSlider.prototype.getDotCount = function() {
        return Math.ceil(this.originalSlidesCount / this.getSettingsForWidth().slidesToScroll);
    };
    
    TeSlider.prototype.getDotIndex = function() {
        return Math.floor(this.getPublicIndex() / this.getSettingsForWidth().slidesToScroll);
    };

    TeSlider.prototype.updateDots = function() {
        const _globalSliderContext = this;
        if (_globalSliderContext.$dots) {
            const dotIndex =_globalSliderContext.getDotIndex();
           _globalSliderContext.$dots.find('li').removeClass('active');
           _globalSliderContext.$dots.find('li').eq(dotIndex).addClass('active');
        }
    };

    TeSlider.prototype.onDotClick = function(e) {
        const _globalSliderContext = this;
        e.preventDefault();
        e.stopPropagation();
        const index = $(e.currentTarget).index();
        const slideIndex = index * _globalSliderContext.getSettingsForWidth().slidesToScroll;
       _globalSliderContext.publicGoTo(slideIndex);
    };

    TeSlider.prototype.getPublicIndex = function(internalIndex) {
        const _globalSliderContext = this;
        const index = internalIndex !== undefined ? internalIndex :_globalSliderContext.currentIndex;
        if (_globalSliderContext.options.loop && !_globalSliderContext.options.fade) {
            return (index - _globalSliderContext.slidesToClone + _globalSliderContext.originalSlidesCount) %_globalSliderContext.originalSlidesCount;
        }
        return Math.max(0, Math.min(index,_globalSliderContext.originalSlidesCount - 1));
    };

    TeSlider.prototype.getSettingsForWidth = function() {
        const _globalSliderContext = this;
        const ww = $(window).width();
        const st = { 
            slidesToShow:_globalSliderContext.options.slidesToShow, 
            slidesToScroll:_globalSliderContext.options.slidesToScroll,
            centerMode:_globalSliderContext.options.centerMode,
            gap: _globalSliderContext.options.gap
        };
        const sortedBps = [].slice.call(_globalSliderContext.options.responsive).sort((a, b) => a.breakpoint - b.breakpoint);
        for (let i = 0; i < sortedBps.length; i++) {
            if (ww <= sortedBps[i].breakpoint) {
                $.extend(st, sortedBps[i].settings);
                break;
            }
        }
        return st;
    };

    TeSlider.prototype.updateHeight = function() {
        const _globalSliderContext = this;
        if (_globalSliderContext.options.adaptiveHeight) {
            const activeSlide =_globalSliderContext.$slides.eq(Math.round(_globalSliderContext.currentIndex));
            const targetHeight = activeSlide.outerHeight(true);
           _globalSliderContext.$list.animate({ height: targetHeight },_globalSliderContext.options.duration);
        }
    };

    TeSlider.prototype.render = function(dontAnimate) {
        const _globalSliderContext = this;
        const settings =_globalSliderContext.getSettingsForWidth();

        if (!_globalSliderContext.$slides || _globalSliderContext.$slides.length === 0) return;

        const listWidth =_globalSliderContext.$list.width();
        if (listWidth <= 0) return;

        const slidesToShow = settings.slidesToShow > 0 ? settings.slidesToShow : 1;
        const gap = settings.gap || 0;
        const slideOuterWidth = listWidth / slidesToShow;
        const slideWidth = slideOuterWidth - gap;

        if (!isFinite(slideWidth) || slideWidth < 0) return;

        const roundedCurrentIndex = Math.round(_globalSliderContext.currentIndex);

        if (_globalSliderContext.options.fade) {
           _globalSliderContext.$slides.css({ transition: 'opacity ' + _globalSliderContext.options.duration + 'ms ease', opacity: 0, zIndex: 1 });
           _globalSliderContext.$slides.eq(roundedCurrentIndex).css({ opacity: 1, zIndex: 2 });
        } else {
            _globalSliderContext.$slides.css({
                "width": slideWidth + "px",
                "margin-left": (gap / 2) + "px",
                "margin-right": (gap / 2) + "px"
            });
            const trackOffset =_globalSliderContext.currentIndex * slideOuterWidth;
            if (settings.centerMode) {
                const centeringOffset = (listWidth - slideOuterWidth) / 2;
                trackOffset -= centeringOffset;
            }
           _globalSliderContext.$track.css({
                transform: "translateX(" + (-trackOffset) + "px)",
                transition: dontAnimate ? 'none' :_globalSliderContext.transitionStyle
            });
        }

       _globalSliderContext.$slides.removeClass("active " + _globalSliderContext.options.centerClass);
        const half = Math.floor(slidesToShow / 2);

        const start = roundedCurrentIndex - half;
        const end = roundedCurrentIndex + half + 1;
       _globalSliderContext.$slides.slice(start, end).addClass("active");
       _globalSliderContext.$slides.eq(roundedCurrentIndex).addClass(_globalSliderContext.options.centerClass);
    };

    TeSlider.prototype.goTo = function(index, silent) {
        const _globalSliderContext = this;
        if (_globalSliderContext.animating && !silent) return;

        const oldPublicIndex =_globalSliderContext.getPublicIndex();
        if (!silent &&_globalSliderContext.options.onBeforeChange) {
           _globalSliderContext.options.onBeforeChange(oldPublicIndex,_globalSliderContext.getPublicIndex(index));
        }

       _globalSliderContext.currentIndex = index;
       _globalSliderContext.animating = true;
       _globalSliderContext.render(silent);

        if (!silent) {
            _globalSliderContext.clearDuringChangeInterval();
            if (_globalSliderContext.options.onDuringChange) {
                _globalSliderContext.duringChangeInterval = setInterval(function() {
                    _globalSliderContext.options.onDuringChange(_globalSliderContext);
                }, 16);
            }
            setTimeout(_globalSliderContext.onAnimationComplete.bind(_globalSliderContext),_globalSliderContext.options.duration);
        } else {
           _globalSliderContext.onAnimationComplete();
        }
    };

    TeSlider.prototype.onAnimationComplete = function() {
        const _globalSliderContext = this;

        _globalSliderContext.clearDuringChangeInterval();

        if (_globalSliderContext.options.loop && !_globalSliderContext.options.fade) {
            if (_globalSliderContext.currentIndex >=_globalSliderContext.originalSlidesCount + _globalSliderContext.slidesToClone) {
               _globalSliderContext.currentIndex =_globalSliderContext.currentIndex - _globalSliderContext.originalSlidesCount;
               _globalSliderContext.render(true);
            }
            if (_globalSliderContext.currentIndex <_globalSliderContext.slidesToClone) {
               _globalSliderContext.currentIndex =_globalSliderContext.currentIndex + _globalSliderContext.originalSlidesCount;
               _globalSliderContext.render(true);
            }
        }
        
       _globalSliderContext.animating = false;
       _globalSliderContext.updateDots();
       _globalSliderContext.updateHeight();
       _globalSliderContext.updateADA();

        if (_globalSliderContext.options.onAfterChange) {
           _globalSliderContext.options.onAfterChange(_globalSliderContext.getPublicIndex());
        }
    };

    TeSlider.prototype.clearDuringChangeInterval = function() {
        const _globalSliderContext = this;
        if (_globalSliderContext.duringChangeInterval) {
            clearInterval(_globalSliderContext.duringChangeInterval);
            _globalSliderContext.duringChangeInterval = null;
        }
    };

    TeSlider.prototype.publicGoTo = function(index) {
        const _globalSliderContext = this;
        const internalIndex = index;
        if (_globalSliderContext.options.loop && !_globalSliderContext.options.fade) {
            internalIndex +=_globalSliderContext.slidesToClone;
        }
       _globalSliderContext.goTo(internalIndex, false);
    };

    TeSlider.prototype.next = function() {
        const _globalSliderContext = this;
        const settings =_globalSliderContext.getSettingsForWidth();
        const newIndex =_globalSliderContext.currentIndex + settings.slidesToScroll;
        if (!_globalSliderContext.options.loop && newIndex >_globalSliderContext.originalSlidesCount - settings.slidesToShow) {
            return;
        }
       _globalSliderContext.goTo(newIndex);
    };

    TeSlider.prototype.prev = function() {
        const _globalSliderContext = this;
        const settings =_globalSliderContext.getSettingsForWidth();
        const newIndex =_globalSliderContext.currentIndex - settings.slidesToScroll;
        if (!_globalSliderContext.options.loop && newIndex < 0) {
            return;
        }
       _globalSliderContext.goTo(newIndex);
    };

    TeSlider.prototype.startAutoplay = function() {
        const _globalSliderContext = this;
       _globalSliderContext.stopAutoplay();
        if (_globalSliderContext.options.autoplay) {
           _globalSliderContext.autoplayTimer = setInterval(_globalSliderContext.next.bind(_globalSliderContext),_globalSliderContext.options.autoplaySpeed);
        }
    };

    TeSlider.prototype.stopAutoplay = function() {
        if (this.autoplayTimer) clearInterval(this.autoplayTimer);
    };

    TeSlider.prototype.onSwipeStart = function(e) {
        const _globalSliderContext = this;
        if (_globalSliderContext.animating) return;
       _globalSliderContext.isSwiping = true;
       _globalSliderContext.swipeStartX = (e.type === 'touchstart' ? e.originalEvent.touches[0] : e).pageX;
       _globalSliderContext.swipeStartTime = new Date().getTime();
       _globalSliderContext.swipeDeltaX = 0;
        const transformMatrix =_globalSliderContext.$track.css("transform").replace(/[^0-9\-.,]/g, "").split(",");
       _globalSliderContext.swipeTrackX = transformMatrix.length > 1 ? parseInt(transformMatrix[4], 10) : 0;
       _globalSliderContext.$track.css('transition', 'none');
       _globalSliderContext.stopAutoplay();
    };

    TeSlider.prototype.onSwipeMove = function(e) {
        const _globalSliderContext = this;
        if (!_globalSliderContext.isSwiping) return;
        e.preventDefault();
        const currentX = (e.type === 'touchmove' ? e.originalEvent.touches[0] : e).pageX;
       _globalSliderContext.swipeDeltaX = currentX - _globalSliderContext.swipeStartX;
       _globalSliderContext.$track.css("transform", "translateX(" + (_globalSliderContext.swipeTrackX + _globalSliderContext.swipeDeltaX) + "px)");
    };

    TeSlider.prototype.onSwipeEnd = function(e) {
        const _globalSliderContext = this;
        if (!_globalSliderContext.isSwiping) return;
       _globalSliderContext.isSwiping = false;

        const swipeDuration = new Date().getTime() - _globalSliderContext.swipeStartTime;
        const swipeVelocity = Math.abs(_globalSliderContext.swipeDeltaX) / swipeDuration;

        if (Math.abs(_globalSliderContext.swipeDeltaX) > 50) {
            let slidesToScroll = Math.max(1, Math.floor(swipeVelocity*0.5));
            console.log(slidesToScroll,'ddd')
            const settings =_globalSliderContext.getSettingsForWidth();
            // slidesToScroll = Math.min(slidesToScroll, settings.slidesToShow);

            let newIndex;
            if (_globalSliderContext.swipeDeltaX < 0) {
                newIndex =_globalSliderContext.currentIndex + slidesToScroll;
            } else {
                newIndex =_globalSliderContext.currentIndex - slidesToScroll;
            }

            if (!_globalSliderContext.options.loop) {
                if (_globalSliderContext.swipeDeltaX < 0) {
                    newIndex = Math.min(newIndex,_globalSliderContext.originalSlidesCount - settings.slidesToShow);
                } else {
                    newIndex = Math.max(newIndex, 0);
                }
            }
           _globalSliderContext.goTo(newIndex);
        } else {
           _globalSliderContext.render();
        }

       _globalSliderContext.startAutoplay();
    };

    TeSlider.prototype.onResize = function() {
        this.render(true);
    };

    $.fn.teSlider = function(option) {
        const args = Array.prototype.slice.call(arguments, 1);
        return this.each(function() {
            const $this = $(this);
            const data = $this.data('teSlider');
            if (!data) {
                $this.data('teSlider', (data = new TeSlider(this, option)));
            }
            if (typeof option === 'string') {
                if (option === 'goTo') option = 'publicGoTo';
                if (data[option]) data[option].apply(data, args);
            }
        });
    };
}));


