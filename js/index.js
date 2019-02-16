(function() {
  var wechatMessage = function() {
    //去掉分页加载了，要不右侧导航没法跳到没加载进来的地方
    //this.maxLength = 500; //一次性加载太多导致UI太卡
    //this.currentPageIndex = 0;
    this.messageContainer = $('.message-container');
    this.timelineContainer = $('.timeline-container');
  }

  wechatMessage.prototype.init = function() {
    var self = this, time = 0, messageTimelineArray = {}, imageTimelineArray = {}, videoTimelineArray = {}, imageArray = [];
    for(var i = 0, l = data.message.length; i < l; i++) {
      var item = data.message[i];
      //非xml结构不解析
      if(item.m_uiMessageType !== 1 
        && item.m_uiMessageType !== 3 
        && item.m_uiMessageType !== 43 
        && item.m_uiMessageType !== 62
        && item.m_uiMessageType !== 34 
        && item.m_nsContent.indexOf('<') === 0 
        && item.m_nsContent.indexOf('SystemMessages_HongbaoIcon.png') < 0) {
          item.m_nsContent = this.xmlToJSON(this.parseXML(item.m_nsContent))  
      }
      if(item.m_nsRealChatUsr) {
        item.m_nsFromUsr = item.m_nsRealChatUsr;
      }
      //右侧timeline对应的model
      var nowtime = new Date(item.m_uiCreateTime * 1000), 
          year = nowtime.getFullYear(), month = nowtime.getMonth() + 1;
      if(!messageTimelineArray[year]) {
        messageTimelineArray[year] = {};
      }
      if(!messageTimelineArray[year][month]) {
        messageTimelineArray[year][month] = {
          href: "m_" + item.m_uiMesLocalID,
          text: month
        };
      }
      //视频timeline
      if(item.m_uiMessageType === 43 || item.m_uiMessageType === 62) {
        if(!videoTimelineArray[year]) {
          videoTimelineArray[year] = {};
        }
        if(!videoTimelineArray[year][month]) {
          videoTimelineArray[year][month] = {
            href: "v_" + item.m_uiMesLocalID,
            text: month
          };
        }
      }
      //10分钟加一次时间吧
      if(nowtime - time >= 10 * 60 * 1000) {
        data.message.splice(i, 0, {
          "m_uiCreateTime" : item.m_uiCreateTime,
          "m_uiMessageType" : "time",
          "m_nsContent" : this.convertTimeToString(item.m_uiCreateTime)
        })
        i++;
        l++;
        time = nowtime.getTime();
      }
      //图片timeline
      if(item.m_uiMessageType === 3) {
        if(!imageTimelineArray[year]) {
          imageTimelineArray[year] = {};
        }
        if(!imageTimelineArray[year][month]) {
          imageTimelineArray[year][month] = {
            href: "i_" + item.m_uiMesLocalID,
            text: month
          };
        }
        item.imageIndex = imageArray.length;
        imageArray.push(item.m_nsContent);
      }
      item.from = data.member[item.m_nsFromUsr] || {};
      item.to = data.member[item.m_nsToUsr] || {};
    }
    console.log(data)
    $('#name').html(data.owner.name);
    this.renderMessage();
    setTimeout(function() {
      self.renderVideo();
      self.renderImage();
      $('.video-item').load();
    }, 2000);
    //右侧timeline
    var timelineTemplate = document.getElementById('timelineTemplate').innerHTML;
    var messageTimelineHtml = tppl(timelineTemplate, {
      data: messageTimelineArray
    });
    $('#messageTimeline').append(messageTimelineHtml);
    var imageTimelineHtml = tppl(timelineTemplate, {
      data: imageTimelineArray
    });
    $('#imageTimeline').append(imageTimelineHtml);
    var videoTimelineHtml = tppl(timelineTemplate, {
      data: videoTimelineArray
    });
    $('#videoTimeline').append(videoTimelineHtml);
    window.wechatImages = imageArray;
    this.bindEvents();
  };

  wechatMessage.prototype.parseXML = function(xml) {
    var xmlDoc;
    //if(xml.indexOf('<?xml version=\"1.0\"?>\n') === 0) {
      //xml = xml.substr(xml.indexOf('<msg'));
      //xml = xml.replace(/[\n\t]/g, '');
    //}
    xml = xml.replace(/[\n\t]/g, '');
    if(xml.indexOf('<voipinvitemsg>') === 0) {
      xml += '</msg>';
      xml = '<msg>' + xml;
    }
    //Internet Explorer
    if(window.ActiveXObject) {
      xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
      xmlDoc.async="false";
      xmlDoc.loadXML(xml);
    } 
    else {
      parser = new DOMParser();
      xmlDoc = parser.parseFromString(xml, "text/xml");
    }
    return xmlDoc;
  };

  wechatMessage.prototype.xmlToJSON = function(xmlObj,nodename,isarray) {
    var obj=$(xmlObj);
    var itemobj={};
    var nodenames="";
    var getAllAttrs=function(node){//递归解析xml 转换成json对象
       var _itemobj={};
       var notNull=false;
       var nodechilds=node.childNodes;
       var childlenght=nodechilds.length;
       var _attrs=node.attributes;
       var firstnodeName="#text";
       try{
         firstnodeName=nodechilds[0].nodeName;
       }catch(e){  }
       if((childlenght>0&&firstnodeName!="#text")|| (_attrs && _attrs.length>0)){
          var _childs=nodechilds;
          var _childslength=nodechilds.length;
          var _fileName_="";
          if(undefined!=_attrs){
            var _attrslength=_attrs.length;
            for(var i=0; i<_attrslength; i++){//解析xml节点属性
             var attrname=_attrs[i].nodeName;
             var attrvalue=_attrs[i].nodeValue;
             _itemobj[attrname]=attrvalue;
            }
          }
        for (var j = 0; j < _childslength; j++) {//解析xml子节点
           var _node = _childs[j];
           var _fildName = _node.nodeName;
           if("#text"==_fildName){break;};
           if(_itemobj[_fildName]!=undefined){//如果有重复的节点需要转为数组格式
             if(!(_itemobj[_fildName] instanceof Array)){
               var a=_itemobj[_fildName];
               _itemobj[_fildName]=[a];//如果该节点出现大于一个的情况 把第一个的值存放到数组中
             }
           }
           var _fildValue=getAllAttrs(_node);
           try{
             _itemobj[_fildName].push(_fildValue);
           }catch(e){
             _itemobj[_fildName]=_fildValue;
             _itemobj["length"]=1;
           }
          }
       }else{
         _itemobj=(node.textContent==undefined)?node.text:node.textContent;
       }
       return _itemobj;
     };
    if(nodename){
     nodenames=nodename.split("/")
    }
    for(var i=0;i<nodenames.length;i++){
      obj=obj.find(nodenames[i]);
    }
    $(obj).each(function(key,item){
      if(itemobj[item.nodeName]!=undefined){
        if(!(itemobj[item.nodeName] instanceof Array)){
          var a=itemobj[item.nodeName];
          itemobj[item.nodeName]=[a];
        }
        itemobj[item.nodeName].push(getAllAttrs(item));
      }else{
        if(nodenames.length>0){
          itemobj[item.nodeName]=getAllAttrs(item);
        }else{
          itemobj[item.firstChild.nodeName]=getAllAttrs(item.firstChild);
        }
      }
    });
    if(nodenames.length>1){
      itemobj=itemobj[nodenames[nodenames.length-1]];
    }
    if(isarray&&!(itemobj instanceof Array)&&itemobj!=undefined){
      itemobj=[itemobj];
    }
    return itemobj;
  };

  wechatMessage.prototype.convertTimeToString = function(time) {
    time = time * 1000;
    var date = new Date(time);
    return date.getFullYear() + '-' + this.getTwoDigitNumer(date.getMonth() + 1) + '-' + this.getTwoDigitNumer(date.getDate()) + ' ' + this.getTwoDigitNumer(date.getHours()) + ':' + this.getTwoDigitNumer(date.getMinutes())
  };

  wechatMessage.prototype.getTwoDigitNumer = function(num) {
    return num >= 10? num : '0' + num
  };

  wechatMessage.prototype.renderMessage = function() {
    var template = document.getElementById('myTemplate').innerHTML;
    var html = tppl(template, {
      data: data.message, //.slice(this.currentPageIndex * this.maxLength, (this.currentPageIndex + 1)* this.maxLength),
      from: data.from
    });
    this.messageContainer.append(html);
    //this.currentPageIndex++;
  };

  wechatMessage.prototype.renderVideo = function() {
    var template = document.getElementById('videoTemplate').innerHTML;
    var html = tppl(template, {
      data: data.message
    });
    $('.video-container').append(html);
  };

  wechatMessage.prototype.renderImage = function() {
    var template = document.getElementById('imageTemplate').innerHTML;
    var html = tppl(template, {
      data: data.message
    });
    $('.image-container').append(html);
  };

  wechatMessage.prototype.bindEvents = function() {
    var self = this,
        messageContainer = $('.message-container'), 
        containerHeight = messageContainer.height(), body = $('body');
    $('.tab-item').on('click', function() {
      var $this = $(this);
      if(!$this.hasClass('selected-item')) {
        $('.selected-item').removeClass('selected-item');
        $this.addClass('selected-item');
        $('.current-tab').removeClass('current-tab');
        $('.' + this.id + '-container').addClass('current-tab');
        $('.current-timeline').removeClass('current-timeline');
        $('#' + this.id + 'Timeline').addClass('current-timeline');
      }
    });

    //timeline年份点击展开
    body.delegate('.timeline-year > h4', 'click', function() {
      var timelineYear = $(this).parent();
      if(!timelineYear.hasClass('current-timeline-year')) {
        $('.current-timeline-year').removeClass('current-timeline-year');
        timelineYear.addClass('current-timeline-year');
      }
    });

    //timeline月份点击改样式
    body.delegate('.timeline-month', 'click', function() {
      var $this = $(this);
      if(!$this.hasClass('current-timeline-month')) {
        $('.current-timeline-month').removeClass('current-timeline-month');
        $this.addClass('current-timeline-month');
      }
    });

    //语音点击
    body.delegate('.voice-img', 'click', function() {
      var $this = $(this), audio = $this.prev('audio');
      if(audio && audio.length) {
        audio = audio[0];
        if(typeof audio.onplay !== 'function') {
          audio.onplay = function() {
            $this.addClass('voice-img-playing');
          }
          audio.onpause = function() {
            $this.removeClass('voice-img-playing');
          }
        }
        if(audio.paused) {
          audio.play();
        }
        else {
          audio.pause();
        }
      }
    });

    //视频点击
    body.delegate('.play-layer', 'click', function() {
      var $this = $(this), video = $this.prev('video');
      if(video && video.length) {
        video = video[0];
        if(typeof video.onplay !== 'function') {
          video.onplay = function() {
            $this.hide();
          }
          video.onpause = function() {
            $this.show();
          }
        }
        if(video.paused) {
          //video.play();
          self.requestFullScreen(video);
          video.play();
        }
      }
    });

    body.delegate('#prev_image', 'click', function(e) {
      alert(1)
      e.stopPropagation();
      return false;
    });

  };

  wechatMessage.prototype.requestFullScreen = function (video) {
    var fullscreen = this.fullSreen(video);
    video[fullscreen]();
  };

  wechatMessage.prototype.fullSreen = function (elem) {
    var prefix, domPrefixes = 'Webkit Moz O ms Khtml'.split(' ');
    // Mozilla and webkit intialise fullscreen slightly differently
    for (var i = -1, len = domPrefixes.length; ++i < len;) {
        prefix = domPrefixes[i].toLowerCase();
        if (elem[prefix + 'EnterFullScreen']) {
            // Webkit uses EnterFullScreen for video
            return prefix + 'EnterFullScreen';
        } else if (elem[prefix + 'RequestFullScreen']) {
            // Mozilla uses RequestFullScreen for all elements and webkit uses it for non video elements
            return prefix + 'RequestFullScreen';
        }
    }
    return false;
  };

  new wechatMessage().init();
})()