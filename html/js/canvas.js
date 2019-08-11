
class qNode {
    constructor(x, y, label) {
        this.set(x, y);

        // this.dx = 0;
        // this.dy = 0;

        // display attr
        this.r = 40;
        
        this.label = label || '';
        
        // for d3
        this.id = this.label;
        this.ax = 0;
        this.ay = 0;


        this.color = '';
    }

    set(x, y) {
        this.x = x;
        this.y = y;
        this.px = x; // previous x
        this.py = y; // previous y
    }

    // shoots packet
    isSending(target, size) {
        var packet = new qNode(this.x + rand(this.r  * 4), this.y + rand(this.r * 4));
        size = size || 100;
        // packet.r = Math.sqrt(size) * 0.6 + 2;
        // sizing 5, 10, 15, 20
        packet.r = 5 * Math.max(Math.log(size) / Math.log(10), 0.5);
        // packet.r = 5 + size / 1500 * 10;
        packet.target = target;
        packet.life = 0 + Math.random() * 50 | 0;
        if (!this.fires) this.fires = [];
        this.fires.push(packet);

        return packet;
    }

    // physics update
    update(delta) {
        if (this.fires) {
            this.fires.forEach(n => {
                var dx = n.target.x - n.x;
                var dy = n.target.y - n.y;
                /*
                var amp = Math.sqrt(dx * dx + dy * dy);
                if (amp === 0) amp = 0.001;

                n.x += dx / amp * 40;
                n.y += dy / amp * 40;
                */

                // // use easing function
                // n.x += dx * 0.15;
                // n.y += dy * 0.15;

                /// take max life = 200
                var k = (n.life / 200);
                k = 1 - k;
                k = 1 - k * k * k;

                n.x += dx * k;
                n.y += dy * k;

                n.life++;

                // animate size?
                // if (n.r > 1) n.r -= 4 * delta;

                // when it reaches target, or simply remove when it's ttl has died.
                if (Math.abs(dx) / 2 < 4 && Math.abs(dy) / 2 < 4
                    || n.life > 1000
                ) {
                    this.fires.splice(this.fires.indexOf(n));
                }
            })
        }

        // this.x += this.dx * delta;
        // this.y += this.dy * delta;

        // var DAMP = 0.4;
        // // damping
        // this.dx *= (1 - DAMP * delta);
        // this.dy *= (1 - DAMP * delta);
        // if (Math.abs(this.dx) < 0.001) this.dx = 0;
        // if (Math.abs(this.dy) < 0.001) this.dy = 0;
    }

    react(delta, node, spread, force, maxSpread) {
        // push apart
        force = force || 1000;
        const dx = node.x - this.x;
        const dy = node.y - this.y;
        const d2 = dx * dx + dy * dy;
        if (d2 === 0) return;

        const minSpread = spread || 150;
        const minSpread2 = minSpread * minSpread;
        maxSpread = 10000;
        const maxSpread2 = maxSpread * maxSpread;

        if (d2 > minSpread2) return;

        const d = Math.pow(d2, 0.5);
        // if (d == 0) d = 0.000001;
        var f = force / d2;

        // if (f > 100) f = 100;

        this.dx -= dx / d * f * delta * 100;
        this.dy -= dy / d * f * delta * 100;

    }

    attract(delta, node) {
        const dx = node.x - this.x;
        const dy = node.y - this.y;

        let d2 = dx * dx + dy * dy;
        if (d2 === 0) return;

        const target = 1000;
        // if (d2 < target * target) return;
        if (d2 < 100) d2 = 10000;

        const d = Math.pow(d2, 0.5);

        // TODO check attraction equation
        var pull = target / d2 * 100; // mass

        // pull together
        this.dx += dx / d * pull * delta;
        this.dy += dy / d * pull * delta;

        // var m = dx / d * pull * delta;
        // if (Math.abs(m) > 1) console.log(m);

    }

    render(ctx) {
        ctx.globalCompositeOperation = 'lighter'
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);

        if (this.color) {
            ctx.fillStyle = this.color;
            ctx.fill();
        } else {
            ctx.strokeStyle = this.rim ? this.rim : '#fff'
            ctx.stroke();
        }

        if (this.fires) {
            this.fires.forEach(f => f.render(ctx));
        }

        var label = this.label;
        if (label) {
            // hack, this should be done in a better way
            if (is_local(label)) label = '*** ' + label + ' ***'
            label = lookup(label) || label
            ctx.fillText(label, this.x, this.y + this.r + 12);
        }

        // debug vectors
        ctx.beginPath();
        ctx.strokeStyle = '#f00'
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        // if (Math.random() < 0.1) console.log(this.y, this.dy);
        ctx.lineTo(this.x + this.dx * 10, this.y + this.dy * 10);
        ctx.stroke();
        ctx.restore();
    }
}

class qCanvas {
    constructor() {
        const canvas = document.createElement('canvas');
        const dpr = devicePixelRatio;
        const w = innerWidth;
        const h = innerHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w;
        canvas.style.height = h;

        const ctx = canvas.getContext('2d');
        this.dom = canvas;
        this.ctx = ctx;
        this.w = w;
        this.h = h;
        ctx.strokeStyle = '#fff';
        ctx.fillStyle = '#fff';

        ctx.scale(dpr, dpr);

        this.nodes = [];

        // track last viewport
        this.viewx = 0;
        this.viewy = 0;
        this.zoom = 1;
    }

    add(node) {
        this.nodes.push(node);
    }

    remove(node) {
        this.nodes.splice(this.nodes.indexOf(node), 1);
    }

    render() {
        const { ctx, w, h, nodes } = this;
        ctx.save();
        // ctx.clearRect(0, 0, w, h);
        // ctx.fillStyle = '#000';
        ctx.clearRect(0, 0, w, h);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        //  point the view port to the center for now
        var ax = 0;
        var ay = 0;
        var packets = 0;

        nodes.forEach(node => {
            ax += node.x;
            ay += node.y;
            if (node.fires) packets += node.fires.length;
        });
        ax /= nodes.length;
        ay /= nodes.length;

        this.viewx += (ax - this.viewx) * 0.65;
        this.viewy += (ay - this.viewy) * 0.65;

        // ctx.translate(w / 2 - this.viewx, h / 2 - this.viewy);
        // ctx.translate(w / 2 - ax, h / 2 - ay);

        ctx.translate(w / 2, h / 2);

        ctx.scale(this.zoom, this.zoom);

        nodes.forEach(node => node.render(ctx))

        // debug center point
        ctx.beginPath();
        ctx.fillStyle = '#0f0'
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        // debug labels
        ctx.fillText(`Nodes: ${nodes.length}\n
        Packets in flight: ${packets}
        `, w - w/5, h - h/5);

    }
}

function rand(n) {
    // returns -0.5,0.5
    return (Math.random() - 0.5) * n;
}