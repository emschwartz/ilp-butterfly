const Header = {
  $type: 'div',
  class: 'text-center',
  $components: [{
    $type: 'h1',
    $text: 'Butterfly ILP'
  }, {
    $type: 'p',
    $text: 'Minimal ILP/SPSP client in the browser',
    class: 'lead'
  }]
}

const IlpSecretInput = {
  $type: 'div',
  class: 'form-group',
  id: 'ilp-secret-group',
  $components: [
    {
      $type: 'label',
      for: 'ilp-secret',
      class: 'control-label',
      $text: 'Your ILP Secret'
    },
    {
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
    if (document.getElementById(this.id).class.indexOf('has-' + status) === 0) {
      return
    }
    document.getElementById(this.id).class = document.getElementById(this.id).class.replace(/ has-\w+/g, '')
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
  $type: 'div',
  class: 'col-xs-12',
  $components:
    [
      IlpSecretInput
    ],
  _plugin: null
}

const SpspAddressInput = {
  $type: 'div',
  class: 'form-group col-xs-12',
  _spspAddress: null,
  $components: [
    {
      $type: 'label',
      for: 'spsp-address',
      $text: 'SPSP Address'
    },
    {
      $type: 'input',
      type: 'email',
      class: 'form-control',
      id: 'spsp-address',
      placeholder: 'user@ilp-kit.example',
      oninput: function () {
        SpspAddressInput._spspAddress = this.value
      },
      $update: function () {
        this.value = this._spspAddress
      }
    }
  ]
}

const MessageInput = {
  $type: 'div',
  class: 'form-group col-xs-12',
  _message: null,
  $components: [
    {
      $type: 'label',
      for: 'message',
      $text: 'Message'
    },
    {
      $type: 'input',
      type: 'text',
      class: 'form-control',
      id: 'message',
      placeholder: 'Isn\'t ILP amazing!?!?',
      oninput: function () {
        MessageInput._message = this.value
      },
      $update: function () {
        this.value = this._message
      }
    }
  ]
}

const SourceAmountInput = {
  $type: 'div',
  class: 'form-group col-xs-6',
  _sourceAmount: null,
  $components: [
    {
      $type: 'label',
      for: 'source-amount',
      $text: 'You Send'
    },
    {
      $type: 'input',
      type: 'number',
      class: 'form-control',
      id: 'source-amount',
      oninput: function () {
        SourceAmountInput._sourceAmount = this.value
        SendForm._getSourceQuote()
      },
      $update: function () {
        this.value = this._sourceAmount
      }
    }
  ]
}

const DestinationAmountInput = {
  $type: 'div',
  class: 'form-group col-xs-6',
  _destinationAmount: null,
  $components: [
    {
      $type: 'label',
      for: 'destinationAmount',
      $text: 'They Get'
    },
    {
      $type: 'input',
      type: 'number',
      class: 'form-control',
      id: 'destination-amount',
      oninput: function () {
        DestinationAmountInput._destinationAmount = this.value
        SendForm._getDestinationQuote()
      },
      $update: function () {
        this.value = this._destinationAmount
      }
    }
  ]
}

const SendButton = {
  $type: 'div',
  $components:
    [
      {
        $type: 'div',
        class: 'col-xs-4'
      },
      {
        $type: 'button',
        id: 'send-button',
        type: 'submit',
        class:  'btn btn-lg btn-primary col-xs-4',
        $text: 'Send',
        onclick: function(e) {
          e.preventDefault()
          SendForm._sendPayment()
        }
      },
      {
        $type: 'div',
        class: 'col-xs-4'
      }
    ],
  _changeClass: function (status) {
    const button = document.getElementById(this.$components[1].id)
    button.class = button.class.replace(/btn-\w{3,}/g, 'btn-' + status)
  },
  _showSuccess: function () {
    this._changeClass('success')
    const _this = this
    setTimeout(function () {
      _this._changeClass('primary')
    }, 1000)
  },
  _showError: function () {
    this._changeClass('danger')
    const _this = this
    setTimeout(function () {
      _this._changeClass('primary')
    }, 1000)
  }
}

const SendForm = {
  $type: 'div',
  id: 'send-form',
  //class: 'container-fluid',
  _spspAddress: null,
  _message: null,
  _sourceAmount: null,
  _destinationAmount: null,
  $components:
    [
      {
        $type: 'form',
        $components:
          [
            {
              $type: 'form',
              $components:
                [
                  SpspAddressInput,
                  MessageInput,
                  SourceAmountInput,
                  DestinationAmountInput,
                  SendButton
                ]
            }
          ]
      }
    ],
  _quote: null,
  _getSourceQuote: function () {
    if (!IlpSecretInput._ilpSecret) {
      IlpSecretInput._showError('ILP Secret is required')
      document.getElementById(IlpSecretInput.$components[1].id).focus()
      this._quote = null
      return
    }
    if (!SpspAddressInput._spspAddress) {
      document.getElementById(SpspAddressInput.$components[1].id).focus()
      this._quote = null
      return
    }
    if (!SourceAmountInput._sourceAmount) {
      this._quote = null
      return
    }
    ILP.SPSP.quote({
        receiver: SpspAddressInput._spspAddress,
        sourceAmount: SourceAmountInput._sourceAmount
    })
      .then((quote) => {
        this._quote = quote
        DestinationAmountInput._destinationAmount = quote.destinationAmount
      })
      .catch((err) => {
        console.error('Error getting quote', err)
      })
  },
  _getDestinationQuote: function () {
    if (!SpspAddressInput._spspAddress) {
      document.getElementById(SpspAddressInput.$components[1].id).focus()
      this._quote = null
      return
    }
    if (!DestinationAmountInput._destinationAmount) {
      this._quote = null
      return
    }
    ILP.SPSP.quote({
        receiver: SpspAddressInput._spspAddress,
        destinationAmount: destinationAmountInput._destinationAmount
    })
      .then((quote) => {
        this._quote = quote
        SourceAmountInput._sourceAmount = quote.sourceAmount
      })
      .catch((err) => {
        console.error('Error getting quote', err)
      })
  },
  _sendPayment: function () {
    if (!this._quote) {

    }
    this._quote.message = MessageInput._message
    this._quote.disableEncryption = true
    this._quote.headers = {
      'Source-Name': 'Butterfly ILP',
      'Source-Image-Url': 'https://i.imgur.com/6g9ORud.jpg',
      'Message': MessageInput._message
    }
    console.log('Sending SPSP payment', this._quote)
    ILP.SPSP.sendPayment(plugin, this._quote)
      .then((result) => {
        console.log('Sent payment', result)
        SendButton._showSuccess()
      })
      .catch((err) => {
        console.log('Error sending payment', err)
        SendButton._showError()
      })
  }
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
    {
      $type: 'div',
      class: 'row',
      $components: [
        {
          $type: 'div',
          class: 'col-xs-3'
        },
        {
          $type: 'form',
          class: 'col-xs-6',
          $components:
            [
              Header,
              UserDetails,
              SendForm
            ]
        },
        {
          $type: 'div',
          class: 'col-xs-3'
        }
      ]
    }
  ]
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
