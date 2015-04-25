;(function($) {
    var keys = {
            ESC: 27,
            TAB: 9,
            RETURN: 13,
            LEFT: 37,
            UP: 38,
            RIGHT: 39,
            DOWN: 40
        };

    function ProductFilter(el, options) {
        var that = this,
                defaults = {
                    deferRequestBy: 1000,   // time intervals during two requests.
                    products: [],           // if products has empty array, we must set the product api.
                    categories: [],
                    controlTips: "",
                    onProductDoubleClick: function() {}
                };

        // Shared variables;
        that.element = el;
        that.el = $(el);
        that.options = $.extend({}, defaults, options);

        that.product_template ='<li class="item" data-product_id="{product-id}" data-product_name="{product-name}" data-category_id="{category-id}">'+
                               '  <div class="img-area">'+
                               '      <img alt="{product-name}" src="{product-imgurl}">'+
                               '  </div>'+
                               '  <p class="title">{product-name}</p>'+
                               '</li>';

        that.searchTextBox = null;
        that.searchDropdownlist = null;
        that.searchResultContainer = null;
        that.serachLoading = null;
        that.currSearchText = null; // current search text value.
        that.productIds = {};       // we keep all selected product id to a javascript object in order to improve the speed of query.

        that.initialize();
    }

    ProductFilter.prototype = {
        initialize: function() {
            var that = this,
                opts = that.options,
                container = that.el;

            container.html('<div class="buttons">'+
                           '    <input type="text" name="search-words" id="search-words" placeholder="input keywords to search" />'+
                           '    <select name="categories" id="categories" class="select"></select>'+
                           '</div>'+
                           '<div class="control-tips">' + opts.controlTips + '</div>'+
                           '<div class="item-container">'+
                           '    <div class="loading-icon" style="display: none;"></div>' + 
                           '    <ul class="items"></ul>'+
                           '</div>');
            
            that.searchTextBox = $("#search-words", container);
            that.searchDropdownlist = $("#categories", container);
            that.searchResultContainer = $("ul.items", container);
            that.searchLoading = $(".loading-icon", container);
            // events.
            that.searchTextBox.on("keyup.productfilter", function(e) { that.validateSearchTextChange(e); });
            that.searchDropdownlist.on("change.productfilter", function() {
                var searchText = $.trim(that.searchTextBox.val()),
                    categoryId = $(this).val();
                that.suggest(searchText, categoryId);
            });

            $("ul.items", container).on("dblclick.productfilter", "li", function() {
                var li = $(this);
                delete that.productIds[li.data("product_id")];
                li.detach();
                if (opts.onProductDoubleClick) {
                    opts.onProductDoubleClick(li);
                }
            });

            that.dataBind();
        },
        /**
         * [onKeyUp description]
         * @param  {[type]} e [description]
         * @return {[type]}   [description]
         */
        validateSearchTextChange: function(e) {
            var that = this;

            switch (e.which) {
                case keys.UP:
                case keys.DOWN:
                    return;
            }

            clearInterval(that.onChangeInterval);

            var searchWord = $.trim(that.searchTextBox.val());
            //if (searchWord == "") return;
            if (that.currSearchText !== searchWord) {
                that.searchResultContainer.hide();
                that.searchLoading.show();
                if (that.options.deferRequestBy > 0) {
                    // Defer lookup in case when value changes very quickly:
                    that.onChangeInterval = setInterval(function () {
                        that.onSearchTextChange();
                    }, that.options.deferRequestBy);
                } else {
                    that.onSearchTextChange();
                }
            }
        },
        onSearchTextChange: function () {
            var that = this,
                searchText = $.trim(that.searchTextBox.val()),
                categoryId = that.searchDropdownlist.val();

            that.currSearchText = searchText;

            clearInterval(that.onChangeInterval);

            that.suggest(searchText, categoryId);
        },
        /**
         * Bind control data
         * @return {[type]} [description]
         */
        dataBind: function() {
            var that = this;

            that._bindCategories();
            that.bindProducts();
        },
        /**
         * Bind products to container.
         * @return {[type]} [description]
         */
        bindProducts: function(new_products) {
            var that = this,
                opts = that.options,
                products = [];

            if (new_products) {
                opts.products = new_products;
            }

            $.each(opts.products, function(index, product) {
                products.push(that.product_template.replace(/\{product\-name\}/g, product.name)
                                                   .replace(/\{product\-id\}/g, product.id)
                                                   .replace(/\{category\-id\}/g, product.category_id)
                                                   .replace(/\{product\-imgurl\}/g, product.image_url));

                that.productIds[product.id] = product.name;
            });

            that.searchResultContainer.html(products.join(''));
        },
        /**
         * Bind categories to two dropdownlist.
         * @return {[type]} [description]
         */
        _bindCategories: function() {
            var that = this,
                opts = that.options,
                categoryOptions = [];

            categoryOptions.push('<option value="">All</option>');
            $.each(opts.categories, function(index, category) {
                categoryOptions.push('<option value="' + category.id + '">' + category.name + '</option>');
            });

            that.searchDropdownlist.append(categoryOptions.join(''));
        },
        /**
         * do the search function.
         * @param  {[type]} searchText          [description]
         * @param  {[type]} categoryIdString    [description]
         * @return {[type]}                     [description]
         */
        suggest: function(searchText, categoryIdString) {
            var that = this,
                dataSources = that.searchResultContainer.find("li"),
                categoryId = parseInt(categoryIdString);

            dataSources.each(function(index, item) {
                item = $(item);
                item.show();

                if (categoryId > 0 && item.data("category_id") !== categoryId) {
                    item.hide();
                }
                else if (item.data("product_name").toLowerCase().indexOf(searchText.toLowerCase()) === -1) {
                    item.hide();
                }
            });

            that.searchResultContainer.show();
            that.searchLoading.hide();
        },
        /**
         * append a product to result container
         * @param {[type]} item [description]
         */
        addProduct: function(item) {
            if (item) {
                this.productIds[$(item).data("product_id")] = $(item).data("product_name");
                this.searchResultContainer.prepend(item);
            }
        },
        contains: function(product_id) {
            if (this.productIds[product_id]) {
                return true;
            }
            return false;
        },
        /**
         * return all products of showing.
         * @return {[type]} [description]
         */
        getCurrentProducts: function() {
            var products = [];
            //$.each(this.searchResultContainer.find("li:visible"), function(index, li) {
            $.each(this.searchResultContainer.find("li"), function(index, li) {
                products.push($(li).data("product_id"));
            });
            return products;
        },
        dispose: function() {
            // Refer from: http://api.jquery.com/empty/
            // To avoid memory leaks, 
            // jQuery removes other constructs such as data and event handlers from the child elements before removing the elements themselves.
            this.el.empty().removeData("productfilter");
        }
    };

    // Create chainable jQuery plugin:
    $.fn.productFilter = function (options, args) {
        instance = new ProductFilter(this.first(), options);
        return this;
    };
})(jQuery);