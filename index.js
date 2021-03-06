var extend = require('xtend/mutable');
var q = require('component-query');
var doc = require('get-doc');
var root = doc && doc.documentElement;
var cookie = require('cookie-cutter');


// platform dependent functionality
var mixins = {
  ios: {
    appMeta: 'apple-itunes-app-meta',
    iconRels: ['apple-touch-icon-precomposed', 'apple-touch-icon'],
    getStoreLink: function () {
      return this.options.url.ios;
    }
  },
  android: {
    appMeta: 'google-play-app',
    iconRels: ['android-touch-icon', 'apple-touch-icon-precomposed', 'apple-touch-icon'],
    getStoreLink: function () {
      return this.options.url.android;
    }
  }
};

var SmartBanner = function (options) {
  var userAgent = navigator.userAgent;
  this.options = extend({}, {
    daysHidden: 15,
    daysReminder: 90,
    appStoreLanguage: 'us', // Language code for App Store
    button: 'OPEN', // Text for the install button
    store: {
      ios: 'On the App Store',
      android: 'In Google Play'
    },
    price: {
      ios: 'FREE',
      android: 'FREE'
    },
    force: false // put platform type (ios, android, etc.) here for emulation
  }, options || {});

  if (this.options.force) {
    this.type = this.options.force;
  } else if (userAgent.match(/iPad|iPhone|iPod/i) !== null) {
    if (userAgent.match(/Safari/i) !== null ||
      (userAgent.match(/CriOS/i) !== null ||
        Number(userAgent.substr(userAgent.indexOf('OS ') + 3, 3).replace('_', '.')) < 6)) {
      this.type = 'ios';
    } // Check webview and native smart banner support (iOS 6+)
  } else if (userAgent.match(/Android/i) !== null) {
    this.type = 'android';
  }

  // Don't show banner if device isn't iOS or Android, website is loaded in app, user dismissed banner, or we have no app id in meta
  if (!this.type ||
    navigator.standalone ||
    cookie.get('smartbanner-closed') ||
    cookie.get('smartbanner-installed')) {
    return;
  }

  extend(this, mixins[this.type]);

  if (!this.parseAppId()) {
    return;
  }

  this.create();
  this.show();
};

SmartBanner.prototype = {
  constructor: SmartBanner,

  create: function () {
    var link = this.getStoreLink();
    var inStore = this.options.price[this.type] + ' - ' + this.options.store[this.type];
    var icon;
    if (this.options.icon) {
      icon = this.options.icon;
    } else {
      for (var i = 0; i < this.iconRels.length; i++) {
        var rel = q('link[rel="' + this.iconRels[i] + '"]');
        if (rel) {
          icon = rel.getAttribute('href');
          break;
        }
      }
    }

    var sb = doc.createElement('div');
    sb.className = 'smartbanner smartbanner-' + this.type;

    sb.innerHTML = '<div class="smartbanner-container">' +
      '<a href="javascript:void(0);" class="smartbanner-close">&times;</a>' +
      '<span class="smartbanner-icon" style="background-image: url(' + icon + ')"></span>' +
      '<div class="smartbanner-info">' +
      '<div class="smartbanner-title">' + this.options.title + '</div>' +
      '<div class="smartbanner-description">' + this.options.description + '</div>' +
      '<div>' + this.options.author + '</div>' +
      '<span>' + inStore + '</span>' +
      '</div>' +
      '<a href="' + link + '" class="smartbanner-button">' +
      '<span class="smartbanner-button-text">' + this.options.button + '</span>' +
      '</a>' +
      '</div>';

    //there isn’t neccessary a body
    if (doc.querySelector('.body-wrapper')) {
      doc.querySelector('.body-wrapper').appendChild(sb);
      doc.body.classList.add('smart-banner');
    } else if (doc) {
      doc.addEventListener('DOMContentLoaded', function () {
        doc.querySelector('.body-wrapper').appendChild(sb);
        doc.body.classList.add('smart-banner');
      });
    }

    q('.smartbanner-button', sb).addEventListener('click', this.install.bind(this), false);
    q('.smartbanner-close', sb).addEventListener('click', this.close.bind(this), false);

  },
  hide: function () {
    root.classList.remove('smartbanner-show');
  },
  show: function () {
    root.classList.add('smartbanner-show');
  },
  close: function () {
    this.hide();
    doc.body.classList.remove('smart-banner');
    cookie.set('smartbanner-closed', 'true', {
      path: '/',
      expires: +new Date() + this.options.daysHidden * 1000 * 60 * 60 * 24
    });
  },
  install: function () {
    this.hide();
    cookie.set('smartbanner-installed', 'true', {
      path: '/',
      expires: +new Date() + this.options.daysReminder * 1000 * 60 * 60 * 24
    });
  },
  parseAppId: function () {
    var meta = q('meta[name="' + this.appMeta + '"]');
    if (!meta) {
      return;
    }

    if (this.type === 'windows') {
      this.appId = meta.getAttribute('content');
    } else {
      this.appId = /app-id=([^\s,]+)/.exec(meta.getAttribute('content'))[1];
    }

    return this.appId;
  }
};

module.exports = SmartBanner;
