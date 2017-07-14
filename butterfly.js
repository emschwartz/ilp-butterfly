const Header = {
  $type: 'div',
  $components: [{
    $type: 'h1',
    $text: 'Butterfly ILP'
  }, {
    $type: 'h1',
    $text: 'A minimal client-side app for sending ILP/SPSP payments',
    class: 'small'
  }]
}

const IlpSecretInput = {
  $type: 'div',
  class: 'form-group col-xs-6',
  id: 'ilp-secret-group',
  $components: [
    {
      $type: 'label',
      for: 'ilp-secret',
      class: 'control-label',
      $text: 'Your ILP Secret'
    }, {
      $type: 'input',
      type: 'password',
      class: 'form-control',
      id: 'ilp-secret',
      placeholder: 'ilp_secret:1:...',
      _ilpSecret: '',
      $init: function () {
        this._ilpSecret = localStorage.getItem('ilpSecret')
      },
      oninput: function () {
        this._ilpSecret = this.value
      },
      $update: function () {
        if (!this._ilpSecret) {
          this.focus()
          return
        }
        tryConnectUsingSecret(this._ilpSecret)
          .then((result) => {
            localStorage.setItem('ilpSecret', this._ilpSecret)
            UserDetails._plugin = result.plugin
            if (result.hasWebsocket) {
              console.log('Connected to ILP provider')
              IlpSecretInput._showSuccess('Connected')
            } else {
              console.log('Connected to ILP provider that does not support Websocket notifications')
              IlpSecretInput._showWarning('Connected without Websocket Notifications')
            }
          })
          .catch((err) => {
            IlpSecretInput._showError('Could not connect to ILP provider')
          })
      }
    }
  ],
  _replaceHighlightClass: function (status) {
    document.getElementById(this.id).class.replace(/ has-\w+/, '')
    document.getElementById(this.id).class += ' has-' + status
  },
  _showWarning: function (text) {
    this._replaceHighlightClass('warning')
  },
  _showError: function (text) {
    this._replaceHighlightClass('error')
  },
  _showSuccess: function (text) {
    this._replaceHighlightClass('success')
  }
}

function tryConnectUsingSecret (ilpSecret) {
  // Check if ILP Secret is valid
  let parsed
  try {
    parsed = ILP.Secret.decode(ilpSecret)
    if (!parsed.token || !parsed.prefix || !parsed.rpcUri) {
      throw new Error('Invalid ILP Secret')
    }
  } catch (err) {
    return Promise.reject(new Error('Invalid ILP Secret'))
  }

  // Try connecting to provider
  const plugin = new ILP.Plugin(parsed)
  return plugin
    .connect()
    .then(() => {
      console.log('Connected to ILP provider')
      return {
        plugin: plugin,
        hasWebsocket: false
      }
    })
  // TODO connect to websocket
}

const UserDetails = {
  $type: 'form',
  $components: [IlpSecretInput],
  _plugin: null
}

const SendForm = {
  $type: 'div',
  class: 'container',
  $components: [{
    $type: 'form',
    $components: [{
      $type: 'div',
      class: 'form-group col-xs-6',
      id: 'send-form',
      $components: [{
        $type: 'label',
        for: 'spspAddress',
        $text: 'SPSP Address'
      }, {
        $type: 'input',
        type: 'email',
        class: 'form-control',
        id: 'spspAddress',
        placeholder: 'user@ilp-kit.example'
      }]
    }, {
      $type: 'div',
      class: 'form-group col-xs-6',
      $components: [{
        $type: 'label',
        for: 'message',
        $text: 'Message'
      }, {
        $type: 'input',
        type: 'text',
        class: 'form-control',
        id: 'message',
        placeholder: 'Isn\'t ILP amazing!?!?'
      }]
    }, {
      $type: 'div',
      class: 'form-group col-xs-2',
      $components: [{
        $type: 'label',
        for: 'sourceAmount',
        $text: 'You Send'
      }, {
        $type: 'input',
        type: 'number',
        class: 'form-control',
        id: 'sourceAmount',
        oninput: function (e) {
          getQuote(
            document.getElementById('ilpToken').value,
            {
              spspAddress: document.getElementById('spspAddress').value,
              message: document.getElementById('message').value,
              sourceAmount: document.getElementById('sourceAmount').value,
              destinationAmount: document.getElementById('destinationAmount').value
            })
        }
      }]
    }, {
      $type: 'div',
      class: 'form-group col-xs-2',
      $components: [{
        $type: 'label',
        for: 'destinationAmount',
        $text: 'They Get'
      }, {
        $type: 'input',
        type: 'number',
        class: 'form-control',
        id: 'destinationAmount',
        oninput: function (e) {
          getQuote(
            document.getElementById('ilpToken').value,
            {
              spspAddress: document.getElementById('spspAddress').value,
              message: document.getElementById('message').value,
              sourceAmount: document.getElementById('sourceAmount').value,
              destinationAmount: document.getElementById('destinationAmount').value
            })
        }
      }]
    }, {
      $type: 'button',
      type: 'submit',
      class:  'btn btn-success',
      $text: 'Send',
      onclick: function(e) {
        e.preventDefault()
        sendSpspPayment(
          document.getElementById('ilpToken').value,
          {
            spspAddress: document.getElementById('spspAddress').value,
            message: document.getElementById('message').value,
            sourceAmount: document.getElementById('sourceAmount').value,
            destinationAmount: document.getElementById('destinationAmount').value
          })
      }
    }]
  }]
}

const Activity = {
  $components: [],
  class: 'activity list-group',
  $type: 'ul',
  _add: function (data) {
    this.$components = [makeActivityItem(data)].concat(this.$components).slice(0,20)
  },
  $init: function () {
    const _this = this
    const ilpTokenField = document.getElementById('ilpToken')
    const ilpTokenGroup = document.getElementById('ilp-token-group')
    connectToProvider()
    ilpTokenField.addEventListener('input', connectToProvider)
    function connectToProvider (e) {
      try {
        const parsed = ILP.Secret.decode(ilpTokenField.value)
        if (!parsed) {
          return
        }
        const protocol = parsed.protocol === 'https' ? 'wss' : 'ws'
        _this._ws = new WebSocket(protocol + '://' + parsed.hostname + ':8081' + '/ws?prefix=' + parsed.prefix + '&token=' + parsed.token)
        _this._ws.addEventListener('message', function (event) {
          _this._add(JSON.parse(event.data))
        })

        _this._ws.addEventListener('open', function () {
          if (ilpTokenGroup.className.indexOf('has-success') === -1) {
            ilpTokenGroup.className = ilpTokenGroup.className.replace(' has-error', '')
            ilpTokenGroup.className += ' has-success'
          }
        })
        _this._ws.addEventListener('error', function () {
          if (ilpTokenGroup.className.indexOf('has-error') === -1) {
            ilpTokenGroup.className = ilpTokenGroup.className.replace(' has-success', '')
            ilpTokenGroup.className += ' has-error'
          }
        })
        localStorage.setItem('ilpToken', ilpTokenField.value)
      } catch (err) {
        console.log(err)
        if (ilpTokenGroup.className.indexOf('has-error') === -1) {
          ilpTokenGroup.className += ' has-error'
        }
        return
      }
    }
  }
}

ಠᴥಠ = {
  $cell: true,
  class: 'container-fluid',
  $components: [
    Header,
    UserDetails,
    //SendForm,
    //Activity
  ]
}

function getQuote (from, to) {
  const sender = ILP.Secret.decode(from)
  console.log('get quote from', sender, to)

  const plugin = new ILP.Plugin({
    rpcUri: sender.protocol + '//' + sender.host + sender.path,
    prefix: sender.prefix,
    token: sender.token
  })
  plugin.connect()
    .then(() => {
      return ILP.SPSP.quote(plugin, {
        receiver: to.spspAddress,
        sourceAmount: to.sourceAmount,
        destinationAmount: to.destinationAmount
      })
    })
    .then((quote) => {
      console.log('got quote', quote)
      if (!to.sourceAmount) {
        document.getElementById('sourceAmount').value = quote.sourceAmount
      } else if (!to.destinationAmount) {
        document.getElementById('destinationAmount').value = quote.destinationAmount
      }
    })
}

function sendSpspPayment (from, to) {
  const sender = ILP.Secret.decode(from)
  console.log('send from', sender, to)

  const plugin = new ILP.Plugin({
    rpcUri: sender.protocol + '//' + sender.host + sender.path,
    prefix: sender.prefix,
    token: sender.token
  })
  plugin.connect()
    .then(() => {
      return ILP.SPSP.quote(plugin, {
        receiver: to.spspAddress,
        // TODO use the original quote we got
        sourceAmount: to.sourceAmount,
        destinationAmount: (to.sourceAmount ? undefined : to.destinationAmount)
      })
    })
    .then((quote) => {
      console.log('got quote', quote)
      quote.message = to.message
      quote.disableEncryption = true
      quote.headers = {
        'Source-Name': 'Butterfly ILP',
        'Source-Image-Url': 'https://i.imgur.com/6g9ORud.jpg',
        'Message': to.message
      }
      console.log('sending spsp payment', quote)
      return ILP.SPSP.sendPayment(plugin, quote)
    })
    .then((result) => {
      console.log('sent payment', result)
    })
    .catch((err) => console.log('error sending payment', err))
}

function makeActivityItem (transfer) {
  const item = {
    class: 'item hidden',
    $init: function () {
      this.className = 'item'
    },
    $components: [{
      $type: 'li',
      class: 'list-group-item',
      $components: [{
        $type: 'p',
        class: 'lead',
        $text: transfer.expiresAt + ' transfer from ' + transfer.from + ' to ' + transfer.to + ' for ' + transfer.amount
      }, {
        $type: 'p',
        $text: 'transfer id: ' + transfer.id
      }, {
        $type: 'p',
        $text: 'ilp packet: ' + transfer.ilp
      }]
    }]
  }
  return item
}
