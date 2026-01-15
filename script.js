/**
 * Image Slideshow Application
 * Modular JavaScript for image selection and slideshow functionality
 */

// Application State
const AppState = {
  images: [],
  selectedImages: [],
  slideshowIndex: 0,
  slideshowTimer: null,
  isSlideshowRunning: false,
  slideshowImgTag: null,
  slideshowInfo: null,
  prevSlideBtn: null,
  nextSlideBtn: null
};

// Theme Management Module
const ThemeManager = {
  init() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-theme');
      $('#themeToggle').text('☀️ Light Mode');
    } else {
      document.body.classList.remove('dark-theme');
      $('#themeToggle').text('🌙 Dark Mode');
    }
  },

  toggle() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    $('#themeToggle').text(isDark ? '☀️ Light Mode' : '🌙 Dark Mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }
};

// UI Utilities Module
const UIUtils = {
  showStatus(message, isError = false) {
    const statusEl = $('#statusMessage');
    statusEl.removeClass('success error')
            .addClass(isError ? 'error' : 'success')
            .text(message)
            .fadeIn();
    setTimeout(() => statusEl.fadeOut(), 3000);
  },

  updateSelectionCount() {
    const count = AppState.images.filter(img => img.selected).length;
    $('#selectionCount').text(`(${count} image${count !== 1 ? 's' : ''} selected)`);
  },

  updateButtonStates() {
    const hasImages = AppState.selectedImages.length > 0;
    $('#startSlideshow').prop('disabled', AppState.isSlideshowRunning || !hasImages);
    $('#stopSlideshow').prop('disabled', !AppState.isSlideshowRunning);
    if (AppState.prevSlideBtn) {
      AppState.prevSlideBtn.prop('disabled', !hasImages);
    }
    if (AppState.nextSlideBtn) {
      AppState.nextSlideBtn.prop('disabled', !hasImages);
    }
  }
};

// Image Selection Module
const ImageSelector = {
  initializeImageSelection() {
    AppState.images.forEach(img => {
      if (img.selected === undefined) {
        img.selected = false;
      }
    });
  },

  handleFileSelection(e) {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) {
      UIUtils.showStatus('Please select at least one image file.', true);
      return;
    }

    // Reset state
    AppState.images = [];
    AppState.selectedImages = [];
    $('#imageTable').empty();
    $('#selectedList').empty();
    $('#slideshow').empty();
    $('#selectionCount').text('');
    
    if (AppState.slideshowTimer) {
      clearInterval(AppState.slideshowTimer);
      AppState.slideshowTimer = null;
      AppState.isSlideshowRunning = false;
    }
    
    AppState.slideshowImgTag = null;
    AppState.slideshowInfo = null;
    AppState.prevSlideBtn = null;
    AppState.nextSlideBtn = null;
    UIUtils.updateButtonStates();

    let loadedCount = 0;
    const totalFiles = files.length;

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        UIUtils.showStatus(`File "${file.name}" is not an image file.`, true);
        return;
      }

      const reader = new FileReader();
      reader.onload = function (evt) {
        const imgObj = {
          src: evt.target.result,
          file: file,
          name: file.name,
          selected: false
        };
        AppState.images.push(imgObj);

        const div = $('<div class="img-cell"></div>');
        const img = $('<img>').attr('src', imgObj.src).attr('alt', imgObj.name);
        const badge = $('<span class="selection-badge">✓</span>');
        
        div.append(img);
        div.append(badge);
        div.data('imageIndex', AppState.images.length - 1);

        // Toggle selection on click using addEventListener pattern
        div[0].addEventListener('click', function() {
          const index = $(this).data('imageIndex');
          const imageObj = AppState.images[index];
          
          imageObj.selected = !imageObj.selected;
          $(this).toggleClass('selected', imageObj.selected);
          
          UIUtils.updateSelectionCount();
        });

        $('#imageTable').append(div);
        
        loadedCount++;
        if (loadedCount === totalFiles) {
          UIUtils.updateSelectionCount();
          UIUtils.showStatus(`Successfully loaded ${totalFiles} image${totalFiles !== 1 ? 's' : ''}.`);
        }
      };

      reader.onerror = function() {
        UIUtils.showStatus(`Error reading file "${file.name}".`, true);
      };

      reader.readAsDataURL(file);
    });
  },

  finalizeSelection() {
    ImageSelector.initializeImageSelection();
    AppState.selectedImages = AppState.images.filter(img => img.selected);
    
    if (AppState.selectedImages.length === 0) {
      UIUtils.showStatus('Please select at least one image before finalizing.', true);
      return;
    }

    // Stop slideshow if running
    if (AppState.slideshowTimer) {
      clearInterval(AppState.slideshowTimer);
      AppState.slideshowTimer = null;
      AppState.isSlideshowRunning = false;
    }

    $('#selectedList').empty();

    AppState.selectedImages.forEach((img, index) => {
      ImageReorderer.addListItem(img, index);
    });

    // Initialize slideshow display
    SlideshowManager.initDisplay();
    
    UIUtils.showStatus(`Finalized selection of ${AppState.selectedImages.length} image${AppState.selectedImages.length !== 1 ? 's' : ''}.`);
  }
};

// Image Reordering Module
const ImageReorderer = {
  addListItem(img, index) {
    const li = $('<li></li>');
    
    const infoDiv = $('<div class="image-info"></div>');
    const preview = $('<img class="image-preview">').attr('src', img.src).attr('alt', img.name);
    const label = $('<span class="image-label"></span>').text(`Image ${index + 1}${img.name ? ': ' + img.name : ''}`);
    
    infoDiv.append(preview);
    infoDiv.append(label);
    
    const controlsDiv = $('<div></div>');
    const up = $('<button class="up-btn">↑ Up</button>');
    const down = $('<button class="down-btn">↓ Down</button>');

    up.on('click', function(e) {
      e.stopPropagation();
      ImageReorderer.moveImage(index, -1);
    });
    
    down.on('click', function(e) {
      e.stopPropagation();
      ImageReorderer.moveImage(index, 1);
    });

    controlsDiv.append(up);
    controlsDiv.append(down);
    
    li.append(infoDiv);
    li.append(controlsDiv);
    $('#selectedList').append(li);
  },

  moveImage(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= AppState.selectedImages.length) {
      return;
    }

    // Swap images
    [AppState.selectedImages[index], AppState.selectedImages[newIndex]] =
      [AppState.selectedImages[newIndex], AppState.selectedImages[index]];

    // Rebuild list
    $('#selectedList').empty();
    AppState.selectedImages.forEach((img, idx) => ImageReorderer.addListItem(img, idx));
    
    UIUtils.showStatus(`Moved image ${direction > 0 ? 'down' : 'up'}.`);
  }
};

// Slideshow Management Module
const SlideshowManager = {
  updateDisplay() {
    if (AppState.selectedImages.length === 0 || AppState.slideshowImgTag === null) return;
    
    AppState.slideshowImgTag.attr('src', AppState.selectedImages[AppState.slideshowIndex].src);
    AppState.slideshowImgTag.attr('alt', `Slide ${AppState.slideshowIndex + 1} of ${AppState.selectedImages.length}`);
    if (AppState.slideshowInfo) {
      AppState.slideshowInfo.text(`Slide ${AppState.slideshowIndex + 1} of ${AppState.selectedImages.length}`);
    }
  },

  initDisplay() {
    if (AppState.selectedImages.length === 0) return;
    
    $('#slideshow').empty();
    
    // Create navigation buttons
    AppState.prevSlideBtn = $('<button class="slideshow-nav-btn" id="prevSlide">◀</button>');
    AppState.nextSlideBtn = $('<button class="slideshow-nav-btn" id="nextSlide">▶</button>');
    
    // Create image container
    AppState.slideshowImgTag = $('<img>');
    
    // Create slideshow container with buttons and image
    const slideshowContainer = $('<div class="slideshow-container"></div>');
    slideshowContainer.append(AppState.prevSlideBtn);
    slideshowContainer.append(AppState.slideshowImgTag);
    slideshowContainer.append(AppState.nextSlideBtn);
    
    // Create info display
    AppState.slideshowInfo = $('<div class="slideshow-info"></div>');
    
    // Create main container
    const container = $('<div></div>');
    container.append(slideshowContainer);
    container.append(AppState.slideshowInfo);
    $('#slideshow').append(container);
    
    // Attach event handlers to navigation buttons
    AppState.prevSlideBtn.on('click', function () {
      SlideshowManager.navigatePrevious();
    });

    AppState.nextSlideBtn.on('click', function () {
      SlideshowManager.navigateNext();
    });
    
    AppState.slideshowIndex = 0;
    SlideshowManager.updateDisplay();
    UIUtils.updateButtonStates();
  },

  navigatePrevious() {
    if (AppState.selectedImages.length === 0) return;
    
    AppState.slideshowIndex = (AppState.slideshowIndex - 1 + AppState.selectedImages.length) % AppState.selectedImages.length;
    SlideshowManager.updateDisplay();
    
    // If slideshow is running, restart timer from current position
    if (AppState.isSlideshowRunning && AppState.slideshowTimer) {
      SlideshowManager.restartTimer();
    }
  },

  navigateNext() {
    if (AppState.selectedImages.length === 0) return;
    
    AppState.slideshowIndex = (AppState.slideshowIndex + 1) % AppState.selectedImages.length;
    SlideshowManager.updateDisplay();
    
    // If slideshow is running, restart timer from current position
    if (AppState.isSlideshowRunning && AppState.slideshowTimer) {
      SlideshowManager.restartTimer();
    }
  },

  restartTimer() {
    if (AppState.slideshowTimer) {
      clearInterval(AppState.slideshowTimer);
    }
    const delay = parseInt($('#delay').val(), 10);
    AppState.slideshowTimer = setInterval(function() {
      AppState.slideshowIndex = (AppState.slideshowIndex + 1) % AppState.selectedImages.length;
      SlideshowManager.updateDisplay();
    }, delay);
  },

  start() {
    if (AppState.selectedImages.length === 0) {
      UIUtils.showStatus('Please finalize your selection first.', true);
      return;
    }

    const delay = parseInt($('#delay').val(), 10);
    
    if (isNaN(delay) || delay < 500) {
      UIUtils.showStatus('Please enter a valid delay (minimum 500ms).', true);
      return;
    }

    // Initialize display if not already done
    if (AppState.slideshowImgTag === null) {
      SlideshowManager.initDisplay();
    }

    // Clear any existing timer
    if (AppState.slideshowTimer) {
      clearInterval(AppState.slideshowTimer);
    }

    // Start automatic slideshow
    AppState.slideshowTimer = setInterval(function() {
      AppState.slideshowIndex = (AppState.slideshowIndex + 1) % AppState.selectedImages.length;
      SlideshowManager.updateDisplay();
    }, delay);

    AppState.isSlideshowRunning = true;
    UIUtils.updateButtonStates();
    UIUtils.showStatus('Slideshow started.');
  },

  stop() {
    if (AppState.slideshowTimer) {
      clearInterval(AppState.slideshowTimer);
      AppState.slideshowTimer = null;
    }
    
    AppState.isSlideshowRunning = false;
    UIUtils.updateButtonStates();
    UIUtils.showStatus('Slideshow stopped.');
  }
};

// Event Handlers Initialization
$(document).ready(function() {
  // Initialize theme
  ThemeManager.init();
  
  // Initialize button states
  UIUtils.updateButtonStates();

  // Theme toggle
  $('#themeToggle').on('click', function() {
    ThemeManager.toggle();
  });

  // File input handler
  $('#fileInput').on('change', function(e) {
    ImageSelector.handleFileSelection(e);
  });

  // Finalize selection
  $('#finalize').on('click', function() {
    ImageSelector.finalizeSelection();
  });

  // Slideshow controls
  $('#startSlideshow').on('click', function() {
    SlideshowManager.start();
  });

  $('#stopSlideshow').on('click', function() {
    SlideshowManager.stop();
  });
});
