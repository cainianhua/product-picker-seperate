// product picker on guide page.
;(function ($) {
    function DataProvider() {}
    DataProvider.prototype = {
        getProducts: function(params, callback) {
            $.ajax({
                url: "/admin/guides/retailer_products",
                data: { retailer_id: params[0] },
                cache: false,
                dataType: "json",
                success: function(items) {
                    if (callback) {
                        callback(null, items);
                    }
                },
                error: function() {
                    callback({ code: 501, message: "There is network error, check your newwork settings and try it again." });
                }
            });
        }
    };
    function ProductPicker(el, options) {
        var that = this,
            defaults = {
                selectedProducts: [],   // products have been selected.
                categories: [],         // all categories of product.
                guideId: null,
                retailerId: null,       // retailer id
                retailerName: "",
                onCompleted: function() {}
            };

        // Shared variables;
        that.element = el;
        that.el = $(el);
        that.options = $.extend({}, defaults, options);

        that.leftView = null;
        that.rightView = null;
        that.retailerControl = null;

        // Initialize:
        that.initialize();
    }
    ProductPicker.prototype = {
        /**
         * [initialize description]
         * @return {[type]} [description]
         */
        initialize: function() {
            var that = this,
                opts = that.options,
                container = that.el;

            container.html('<h2>Manage Products</h3>'+
                           '<div class="retailer"><label>Retailer Name: </label><span>' + opts.retailerName + '</span></div>'+
                           '<div class="products">'+
                           '    <div class="product-area left"></div>'+
                           '    <div class="product-area right"></div>'+
                           '</div>'+
                           '<div class="actions"><button name="button" type="button" id="save-button">Save</button><span id="action-tips"></span></div>');

            that.retailerControl = $(".retailer", container);

            that.leftView = new $.ProductFilter($("div.left", container).get(0), {
                //products: avaliableRetailerProducts,
                categories: opts.categories,
                controlTips: "Double click the below products to add to the current guide:",
                onProductDoubleClick: function(li) {
                    that.rightView.addProduct(li);
                }
            });

            that.rightView = new $.ProductFilter($("div.right", container).get(0), {
                products: opts.selectedProducts,
                categories: opts.categories,
                controlTips: "Double click the below products to remove from the current guide:",
                onProductDoubleClick: function(li) {
                    that.leftView.addProduct(li);
                }
            });

            $("#save-button", container).on("click.productpicker", function() {
                that.hideMessage();
                if (opts.onCompleted) {
                    opts.onCompleted(that.rightView.getCurrentProducts());
                }
                $.colorbox.close();
            });
        },
        /**
         * [loadData description]
         * @param  {[type]}
         * @return {[type]}
         */
        loadData: function(retailerArr) {
            var that = this,
                dataProvider = new DataProvider();

            that.leftView.searchLoading.show();
            dataProvider.getProducts(retailerArr, function(err, products) {
                that.leftView.searchLoading.hide();
                if (err) {
                    window.alert(err.message);
                    return;
                }
                that.processResponse(products);
            });

            //that.retailerControl.find("span").text(retailerArr[1]);
        },
        processResponse: function(items) {
            var that = this,
                available_products = [];
            $.each(items, function(index, item) {
                if (!that.rightView.contains(item.id)) {
                    available_products.push(item);
                }
            });
            that.leftView.bindProducts(available_products);
        },
        /**
         * destroy
         * @return {[type]} [description]
         */
        dispose: function () {
            // Refer from: http://api.jquery.com/empty/
            // To avoid memory leaks, 
            // jQuery removes other constructs such as data and event handlers from the child elements before removing the elements themselves.
            this.leftView.dispose();
            this.rightView.dispose();
            this.el.empty().removeData("productpicker");
        }
    };
    // Create chainable jQuery plugin:
    $.fn.productPicker = function (options, args) {
        var dataKey = 'productpicker';
        // If function invoked without argument return
        // instance of the first matched element:
        if (arguments.length === 0) {
            return this.first().data(dataKey);
        }
        return this.each(function () {
            var _self = $(this),
                instance = _self.data(dataKey);

            if (typeof options === 'string') {
                if (instance && typeof instance[options] === 'function') {
                    instance[options](args);
                }
            } else {
                // If instance already exists, destroy it:
                if (instance && instance.dispose) {
                    instance.dispose();
                }
                instance = new ProductPicker(this, options);
                _self.data(dataKey, instance);
            }
        });
    };
})(jQuery);