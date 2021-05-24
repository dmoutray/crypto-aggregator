
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.38.2 */

    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	child_ctx[22] = list;
    	child_ctx[23] = i;
    	return child_ctx;
    }

    // (136:2) {#each coinInformation as coin}
    function create_each_block_2(ctx) {
    	let div4;
    	let div3;
    	let div0;
    	let span;
    	let t0_value = /*coin*/ ctx[19].symbol + "";
    	let t0;
    	let t1;
    	let div1;
    	let input0;
    	let t2;
    	let div2;
    	let input1;
    	let t3;
    	let button;
    	let t4;
    	let t5_value = /*coin*/ ctx[19].symbol + "";
    	let t5;
    	let mounted;
    	let dispose;

    	function input0_input_handler() {
    		/*input0_input_handler*/ ctx[8].call(input0, /*each_value_2*/ ctx[22], /*coin_index_1*/ ctx[23]);
    	}

    	function input1_input_handler() {
    		/*input1_input_handler*/ ctx[9].call(input1, /*each_value_2*/ ctx[22], /*coin_index_1*/ ctx[23]);
    	}

    	function click_handler() {
    		return /*click_handler*/ ctx[10](/*coin*/ ctx[19]);
    	}

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			span = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			input0 = element("input");
    			t2 = space();
    			div2 = element("div");
    			input1 = element("input");
    			t3 = space();
    			button = element("button");
    			t4 = text("remove ");
    			t5 = text(t5_value);
    			attr_dev(span, "class", "");
    			add_location(span, file, 139, 10, 3807);
    			attr_dev(div0, "class", "col-sm-1 gy-4");
    			add_location(div0, file, 138, 8, 3768);
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "class", "form-control");
    			add_location(input0, file, 142, 10, 3902);
    			attr_dev(div1, "class", "col-auto");
    			add_location(div1, file, 141, 8, 3868);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "class", "form-control");
    			add_location(input1, file, 145, 10, 4031);
    			attr_dev(div2, "class", "col-auto");
    			add_location(div2, file, 144, 8, 3997);
    			attr_dev(button, "class", "btn btn-primary col-sm-2");
    			add_location(button, file, 151, 8, 4183);
    			attr_dev(div3, "class", "row gx-3 gy-2 justify-content-center align-items-center my-2");
    			add_location(div3, file, 137, 6, 3684);
    			add_location(div4, file, 136, 4, 3671);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, div0);
    			append_dev(div0, span);
    			append_dev(span, t0);
    			append_dev(div3, t1);
    			append_dev(div3, div1);
    			append_dev(div1, input0);
    			set_input_value(input0, /*coin*/ ctx[19].amount);
    			append_dev(div3, t2);
    			append_dev(div3, div2);
    			append_dev(div2, input1);
    			set_input_value(input1, /*coin*/ ctx[19].purchasePrice);
    			append_dev(div3, t3);
    			append_dev(div3, button);
    			append_dev(button, t4);
    			append_dev(button, t5);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", input0_input_handler),
    					listen_dev(input1, "input", input1_input_handler),
    					listen_dev(button, "click", click_handler, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*coinInformation*/ 1 && t0_value !== (t0_value = /*coin*/ ctx[19].symbol + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*coinInformation*/ 1 && to_number(input0.value) !== /*coin*/ ctx[19].amount) {
    				set_input_value(input0, /*coin*/ ctx[19].amount);
    			}

    			if (dirty & /*coinInformation*/ 1 && to_number(input1.value) !== /*coin*/ ctx[19].purchasePrice) {
    				set_input_value(input1, /*coin*/ ctx[19].purchasePrice);
    			}

    			if (dirty & /*coinInformation*/ 1 && t5_value !== (t5_value = /*coin*/ ctx[19].symbol + "")) set_data_dev(t5, t5_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(136:2) {#each coinInformation as coin}",
    		ctx
    	});

    	return block;
    }

    // (165:8) {#each coinList.filter((item) => !coinInformation                .map((item) => item.symbol)                .includes(item)) as coin}
    function create_each_block_1(ctx) {
    	let option;
    	let t_value = /*coin*/ ctx[19] + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*coin*/ ctx[19];
    			option.value = option.__value;
    			add_location(option, file, 167, 10, 4790);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*coinInformation*/ 1 && t_value !== (t_value = /*coin*/ ctx[19] + "")) set_data_dev(t, t_value);

    			if (dirty & /*coinInformation*/ 1 && option_value_value !== (option_value_value = /*coin*/ ctx[19])) {
    				prop_dev(option, "__value", option_value_value);
    				option.value = option.__value;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(165:8) {#each coinList.filter((item) => !coinInformation                .map((item) => item.symbol)                .includes(item)) as coin}",
    		ctx
    	});

    	return block;
    }

    // (186:6) {#each coinInformation as coinInfo}
    function create_each_block(ctx) {
    	let tr;
    	let th;
    	let t0_value = /*coinInfo*/ ctx[16].symbol + "";
    	let t0;
    	let t1;
    	let td0;
    	let t2_value = /*coinInfo*/ ctx[16].currentMarketPrice.gbp + "";
    	let t2;
    	let t3;
    	let td1;
    	let t4_value = /*coinInfo*/ ctx[16].currentMarketPrice.usd + "";
    	let t4;
    	let t5;

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			th = element("th");
    			t0 = text(t0_value);
    			t1 = space();
    			td0 = element("td");
    			t2 = text(t2_value);
    			t3 = space();
    			td1 = element("td");
    			t4 = text(t4_value);
    			t5 = space();
    			attr_dev(th, "scope", "row");
    			add_location(th, file, 187, 10, 5272);
    			add_location(td0, file, 188, 10, 5322);
    			add_location(td1, file, 189, 10, 5376);
    			add_location(tr, file, 186, 8, 5256);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, th);
    			append_dev(th, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td0);
    			append_dev(td0, t2);
    			append_dev(tr, t3);
    			append_dev(tr, td1);
    			append_dev(td1, t4);
    			append_dev(tr, t5);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*coinInformation*/ 1 && t0_value !== (t0_value = /*coinInfo*/ ctx[16].symbol + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*coinInformation*/ 1 && t2_value !== (t2_value = /*coinInfo*/ ctx[16].currentMarketPrice.gbp + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*coinInformation*/ 1 && t4_value !== (t4_value = /*coinInfo*/ ctx[16].currentMarketPrice.usd + "")) set_data_dev(t4, t4_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(186:6) {#each coinInformation as coinInfo}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div9;
    	let div0;
    	let h1;
    	let t1;
    	let div4;
    	let div1;
    	let h30;
    	let t3;
    	let h20;
    	let t4;
    	let t5;
    	let t6;
    	let div2;
    	let h31;
    	let t8;
    	let h21;
    	let t9;
    	let t10;
    	let t11;
    	let div3;
    	let h32;
    	let t13;
    	let h22;
    	let t14_value = /*percentageChange*/ ctx[2] - 100 + "";
    	let t14;
    	let t15;
    	let t16;
    	let t17;
    	let div7;
    	let div5;
    	let label0;
    	let t19;
    	let select;
    	let t20;
    	let div6;
    	let button;
    	let t22;
    	let table;
    	let thead;
    	let tr;
    	let th0;
    	let t24;
    	let th1;
    	let t26;
    	let th2;
    	let t28;
    	let tbody;
    	let t29;
    	let div8;
    	let input;
    	let t30;
    	let label1;
    	let mounted;
    	let dispose;
    	let each_value_2 = /*coinInformation*/ ctx[0];
    	validate_each_argument(each_value_2);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value_1 = /*coinList*/ ctx[5].filter(/*func*/ ctx[11]);
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*coinInformation*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div9 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Investment Aggre-gator 🐊";
    			t1 = space();
    			div4 = element("div");
    			div1 = element("div");
    			h30 = element("h3");
    			h30.textContent = "Total Invested";
    			t3 = space();
    			h20 = element("h2");
    			t4 = text("£");
    			t5 = text(/*totalInvested*/ ctx[4]);
    			t6 = space();
    			div2 = element("div");
    			h31 = element("h3");
    			h31.textContent = "Current investment gains";
    			t8 = space();
    			h21 = element("h2");
    			t9 = text("£");
    			t10 = text(/*currentInvestmentValue*/ ctx[3]);
    			t11 = space();
    			div3 = element("div");
    			h32 = element("h3");
    			h32.textContent = "Percentage change";
    			t13 = space();
    			h22 = element("h2");
    			t14 = text(t14_value);
    			t15 = text("%");
    			t16 = space();

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t17 = space();
    			div7 = element("div");
    			div5 = element("div");
    			label0 = element("label");
    			label0.textContent = "Preference";
    			t19 = space();
    			select = element("select");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t20 = space();
    			div6 = element("div");
    			button = element("button");
    			button.textContent = "add coin";
    			t22 = space();
    			table = element("table");
    			thead = element("thead");
    			tr = element("tr");
    			th0 = element("th");
    			th0.textContent = "Coin";
    			t24 = space();
    			th1 = element("th");
    			th1.textContent = "£ gbp";
    			t26 = space();
    			th2 = element("th");
    			th2.textContent = "$ usd";
    			t28 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t29 = space();
    			div8 = element("div");
    			input = element("input");
    			t30 = space();
    			label1 = element("label");
    			label1.textContent = "Notifications";
    			add_location(h1, file, 117, 4, 2994);
    			attr_dev(div0, "class", "justify-content-center py-4");
    			add_location(div0, file, 116, 2, 2947);
    			add_location(h30, file, 122, 6, 3164);
    			add_location(h20, file, 123, 6, 3195);
    			attr_dev(div1, "class", "col justify-content-center shadow p-3 mb-5 bg-body rounded text-center");
    			add_location(div1, file, 121, 4, 3072);
    			attr_dev(h31, "class", "justify-content-center ");
    			add_location(h31, file, 126, 6, 3312);
    			add_location(h21, file, 127, 6, 3385);
    			attr_dev(div2, "class", "col mx-3 shadow p-3 mb-5 bg-body rounded text-center");
    			add_location(div2, file, 125, 4, 3238);
    			attr_dev(h32, "class", "justify-content-center ");
    			add_location(h32, file, 130, 6, 3506);
    			add_location(h22, file, 131, 6, 3572);
    			attr_dev(div3, "class", "col shadow p-3 mb-5 bg-body rounded text-center");
    			add_location(div3, file, 129, 4, 3437);
    			attr_dev(div4, "class", "row my-5");
    			add_location(div4, file, 120, 2, 3044);
    			attr_dev(label0, "class", "visually-hidden");
    			attr_dev(label0, "for", "specificSizeSelect");
    			add_location(label0, file, 162, 6, 4480);
    			attr_dev(select, "class", "form-select");
    			attr_dev(select, "id", "specificSizeSelect");
    			if (/*newCoin*/ ctx[1] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[12].call(select));
    			add_location(select, file, 163, 6, 4562);
    			attr_dev(div5, "class", "col-sm-3 gy-4");
    			add_location(div5, file, 161, 4, 4445);
    			attr_dev(button, "class", "btn btn-primary");
    			add_location(button, file, 172, 6, 4908);
    			attr_dev(div6, "class", "col-auto");
    			add_location(div6, file, 171, 4, 4878);
    			attr_dev(div7, "class", "row justify-content-center align-items-end");
    			add_location(div7, file, 160, 2, 4383);
    			attr_dev(th0, "scope", "col");
    			add_location(th0, file, 179, 8, 5066);
    			attr_dev(th1, "scope", "col");
    			add_location(th1, file, 180, 8, 5101);
    			attr_dev(th2, "scope", "col");
    			add_location(th2, file, 181, 8, 5137);
    			add_location(tr, file, 178, 6, 5052);
    			add_location(thead, file, 177, 4, 5037);
    			add_location(tbody, file, 184, 4, 5196);
    			attr_dev(table, "class", "table");
    			add_location(table, file, 176, 2, 5010);
    			attr_dev(input, "class", "form-check-input");
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "id", "flexSwitchCheckChecked");
    			add_location(input, file, 197, 4, 5524);
    			attr_dev(label1, "class", "form-check-label");
    			attr_dev(label1, "for", "flexSwitchCheckChecked");
    			add_location(label1, file, 198, 4, 5606);
    			attr_dev(div8, "class", "form-check form-switch");
    			add_location(div8, file, 196, 2, 5482);
    			attr_dev(div9, "class", "container");
    			add_location(div9, file, 115, 0, 2920);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div0);
    			append_dev(div0, h1);
    			append_dev(div9, t1);
    			append_dev(div9, div4);
    			append_dev(div4, div1);
    			append_dev(div1, h30);
    			append_dev(div1, t3);
    			append_dev(div1, h20);
    			append_dev(h20, t4);
    			append_dev(h20, t5);
    			append_dev(div4, t6);
    			append_dev(div4, div2);
    			append_dev(div2, h31);
    			append_dev(div2, t8);
    			append_dev(div2, h21);
    			append_dev(h21, t9);
    			append_dev(h21, t10);
    			append_dev(div4, t11);
    			append_dev(div4, div3);
    			append_dev(div3, h32);
    			append_dev(div3, t13);
    			append_dev(div3, h22);
    			append_dev(h22, t14);
    			append_dev(h22, t15);
    			append_dev(div9, t16);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(div9, null);
    			}

    			append_dev(div9, t17);
    			append_dev(div9, div7);
    			append_dev(div7, div5);
    			append_dev(div5, label0);
    			append_dev(div5, t19);
    			append_dev(div5, select);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(select, null);
    			}

    			select_option(select, /*newCoin*/ ctx[1]);
    			append_dev(div7, t20);
    			append_dev(div7, div6);
    			append_dev(div6, button);
    			append_dev(div9, t22);
    			append_dev(div9, table);
    			append_dev(table, thead);
    			append_dev(thead, tr);
    			append_dev(tr, th0);
    			append_dev(tr, t24);
    			append_dev(tr, th1);
    			append_dev(tr, t26);
    			append_dev(tr, th2);
    			append_dev(table, t28);
    			append_dev(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}

    			append_dev(div9, t29);
    			append_dev(div9, div8);
    			append_dev(div8, input);
    			append_dev(div8, t30);
    			append_dev(div8, label1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(select, "change", /*select_change_handler*/ ctx[12]),
    					listen_dev(button, "click", /*handleAddCoin*/ ctx[6], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*totalInvested*/ 16) set_data_dev(t5, /*totalInvested*/ ctx[4]);
    			if (dirty & /*currentInvestmentValue*/ 8) set_data_dev(t10, /*currentInvestmentValue*/ ctx[3]);
    			if (dirty & /*percentageChange*/ 4 && t14_value !== (t14_value = /*percentageChange*/ ctx[2] - 100 + "")) set_data_dev(t14, t14_value);

    			if (dirty & /*handleRemoveCoin, coinInformation*/ 129) {
    				each_value_2 = /*coinInformation*/ ctx[0];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(div9, t17);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_2.length;
    			}

    			if (dirty & /*coinList, coinInformation*/ 33) {
    				each_value_1 = /*coinList*/ ctx[5].filter(/*func*/ ctx[11]);
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*newCoin, coinList, coinInformation*/ 35) {
    				select_option(select, /*newCoin*/ ctx[1]);
    			}

    			if (dirty & /*coinInformation*/ 1) {
    				each_value = /*coinInformation*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tbody, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div9);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let percentageChange;
    	let currentInvestmentValue;
    	let totalInvested;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let currencies = ["gbp", "usd"];
    	let coinList = ["bitcoin", "cardano", "ark", "dogecoin"];
    	let coinInformation;
    	let savedInfo = localStorage.getItem("coinInformation");

    	if (savedInfo) {
    		coinInformation = JSON.parse(savedInfo);
    	} else {
    		coinInformation = [
    			{
    				id: 1,
    				symbol: "bitcoin",
    				amount: 0,
    				purchasePrice: 0,
    				currentMarketPrice: { gbp: 0, usd: 0 }
    			},
    			{
    				id: 2,
    				symbol: "cardano",
    				amount: 0,
    				purchasePrice: 0,
    				currentMarketPrice: { gbp: 0, usd: 0 }
    			}
    		];
    	}

    	let newCoin = coinList[0];

    	function getMarketData() {
    		return fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinInformation.map(coin => coin.symbol).join("%2C")}&vs_currencies=${currencies.join("%2C")}`).then(response => response.json()).then(result => {
    			let newInfo = coinInformation.map(coin => {
    				coin.currentMarketPrice["gbp"] = parseFloat(result[coin.symbol]["gbp"]);
    				coin.currentMarketPrice["usd"] = parseFloat(result[coin.symbol]["usd"]);
    				return coin;
    			});

    			$$invalidate(0, coinInformation = [...newInfo]);
    			localStorage.setItem("coinInformation", JSON.stringify(coinInformation));
    			return result;
    		});
    	}

    	function handleAddCoin() {
    		$$invalidate(0, coinInformation = [
    			...coinInformation,
    			{
    				id: coinInformation.length + 2,
    				symbol: newCoin,
    				amount: 0,
    				purchasePrice: 0,
    				currentMarketPrice: { gbp: 0, usd: 0 }
    			}
    		]);

    		getMarketData();
    	}

    	function handleRemoveCoin(id) {
    		let update = coinInformation.filter(item => item.id !== id);
    		$$invalidate(0, coinInformation = [...update]);
    		localStorage.setItem("coinInformation", JSON.stringify(coinInformation));
    	}

    	// Do the initial fetch of the data on page load.
    	getMarketData();

    	setInterval(getMarketData, 10000);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler(each_value_2, coin_index_1) {
    		each_value_2[coin_index_1].amount = to_number(this.value);
    		$$invalidate(0, coinInformation);
    	}

    	function input1_input_handler(each_value_2, coin_index_1) {
    		each_value_2[coin_index_1].purchasePrice = to_number(this.value);
    		$$invalidate(0, coinInformation);
    	}

    	const click_handler = coin => handleRemoveCoin(coin.id);
    	const func = item => !coinInformation.map(item => item.symbol).includes(item);

    	function select_change_handler() {
    		newCoin = select_value(this);
    		$$invalidate(1, newCoin);
    		$$invalidate(5, coinList);
    		$$invalidate(0, coinInformation);
    	}

    	$$self.$capture_state = () => ({
    		currencies,
    		coinList,
    		coinInformation,
    		savedInfo,
    		newCoin,
    		getMarketData,
    		handleAddCoin,
    		handleRemoveCoin,
    		percentageChange,
    		currentInvestmentValue,
    		totalInvested
    	});

    	$$self.$inject_state = $$props => {
    		if ("currencies" in $$props) currencies = $$props.currencies;
    		if ("coinList" in $$props) $$invalidate(5, coinList = $$props.coinList);
    		if ("coinInformation" in $$props) $$invalidate(0, coinInformation = $$props.coinInformation);
    		if ("savedInfo" in $$props) savedInfo = $$props.savedInfo;
    		if ("newCoin" in $$props) $$invalidate(1, newCoin = $$props.newCoin);
    		if ("percentageChange" in $$props) $$invalidate(2, percentageChange = $$props.percentageChange);
    		if ("currentInvestmentValue" in $$props) $$invalidate(3, currentInvestmentValue = $$props.currentInvestmentValue);
    		if ("totalInvested" in $$props) $$invalidate(4, totalInvested = $$props.totalInvested);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*coinInformation*/ 1) {
    			$$invalidate(2, percentageChange = coinInformation.reduce(
    				function (total, coin) {
    					return coin.currentMarketPrice !== 0
    					? total + coin.amount * (coin.currentMarketPrice.gbp / coin.purchasePrice)
    					: 0;
    				},
    				0
    			).toFixed(0));
    		}

    		if ($$self.$$.dirty & /*coinInformation*/ 1) {
    			$$invalidate(3, currentInvestmentValue = coinInformation.reduce(
    				function (total, coin) {
    					return coin.currentMarketPrice !== 0
    					? total + coin.amount * (coin.currentMarketPrice.gbp - coin.purchasePrice)
    					: 0;
    				},
    				0
    			).toFixed(2));
    		}

    		if ($$self.$$.dirty & /*coinInformation*/ 1) {
    			$$invalidate(4, totalInvested = coinInformation.reduce(
    				(total, coin) => {
    					return total + coin.amount * coin.purchasePrice;
    				},
    				0
    			));
    		}
    	};

    	return [
    		coinInformation,
    		newCoin,
    		percentageChange,
    		currentInvestmentValue,
    		totalInvested,
    		coinList,
    		handleAddCoin,
    		handleRemoveCoin,
    		input0_input_handler,
    		input1_input_handler,
    		click_handler,
    		func,
    		select_change_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
